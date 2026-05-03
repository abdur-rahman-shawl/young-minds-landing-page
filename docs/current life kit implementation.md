# Current LiveKit Implementation

> Historical snapshot: this document captures the verified self-hosted Oracle VM + `ngrok` implementation that existed before the LiveKit Cloud migration.
> For the active rollout path, use [docs/livekit-cloud-setup.md](docs/livekit-cloud-setup.md).

Last verified: 2026-03-31 UTC

## Purpose

This document is the canonical, current-state snapshot of the LiveKit implementation that exists across:

- the Next.js application in this repository
- the Oracle VM at `140.245.251.150`
- the `ngrok` tunnel currently fronting LiveKit
- the separate local helper folder at `C:\Users\Dell\Desktop\Play\YM\livekit`

This document is intentionally exhaustive. It is written so a junior developer can understand:

- what is deployed
- what is only local support tooling
- which code paths are actually used
- which configs are current
- which docs are historical/outdated
- which parts are working
- which parts are partially implemented
- which parts are broken or misaligned

This document is based only on directly verified evidence from the repository, the VM, and the local helper folder. Where something is an inference rather than a directly observed fact, it is labeled as an inference.

## Security note

Real secrets exist in several places in the current setup. This document intentionally does not reproduce secret values. It records:

- where secrets live
- which systems consume them
- whether they match across systems
- whether storage/permissions are safe or unsafe

This follows the repository guideline not to commit real secrets into project docs.

## Conventions used here

- "Verified" means directly observed from code, config, process state, logs, filesystem, or HTTP response.
- "Inference" means a conclusion drawn from verified facts but not directly observed in the external hosting layer.
- "Historical" means something present in local docs/scripts/logs that explains prior implementation intent but is not necessarily current runtime behavior.

---

## 1. Executive Summary

The current LiveKit system is split across two places:

1. The Next.js app in this repository is responsible for LiveKit room creation, access-token minting, meeting-page gating, recording bookkeeping, recording playback URLs, and webhook handlers.
2. The Oracle VM is responsible for running the actual LiveKit server, Redis, LiveKit Egress, and the `ngrok` tunnel.

The most important verified truths are:

- LiveKit rooms are created by this Next.js app, not by a token server on the VM.
- LiveKit access tokens are minted by this Next.js app, not by the VM.
- Browsers connect from the meeting page to the LiveKit server using the `wsUrl` returned by the access-token route.
- The VM currently runs LiveKit correctly and is publicly reachable both directly by IP and through `ngrok`.
- `ngrok` currently tunnels `https://fragile-killian-unmutualized.ngrok-free.dev` to `http://localhost:7880` on the VM.
- The checked-in local app env does **not** point to `ngrok`; it points to the VM's raw IP.
- The VM currently tries to send webhooks to `http://localhost:3000/...`, but nothing is listening on port `3000` on that VM.
- Therefore LiveKit room webhooks are currently failing on the VM.
- LiveKit Egress is installed and active on the VM.
- Recording is currently disabled at the app layer by code, even though the VM still has working Egress infrastructure.
- The separate local folder `C:\Users\Dell\Desktop\Play\YM\livekit` contains older/historical helper scripts, HTML test pages, local token-server experiments, notes, logs, and the SSH key. It is **not** the canonical runtime implementation.

---

## 2. Full System Architecture

## 2.1 High-level component map

Current system components:

- Next.js application repository: `C:\Users\Dell\Desktop\Play\YM\young-minds-landing-page`
- Oracle VM host: `ubuntu@140.245.251.150`
- LiveKit server binary on VM
- Redis container on VM
- LiveKit Egress container on VM
- `ngrok` agent on VM
- local helper folder: `C:\Users\Dell\Desktop\Play\YM\livekit`

## 2.2 Current runtime flow

Current verified runtime flow:

1. A session booking is created in the Next.js app.
2. The booking flow calls `LiveKitRoomManager.createRoomForSession(...)`.
3. `LiveKitRoomManager` calls the LiveKit server API on the Oracle VM to create the actual LiveKit room.
4. `LiveKitRoomManager` stores room and participant records in Postgres.
5. A user visits `/meeting/[sessionId]`.
6. The server-rendered meeting page checks auth, session ownership, meeting time window, and room existence.
7. The meeting client calls `/api/sessions/[sessionId]/livekit/access-token`.
8. That API route validates the logged-in user is a room participant.
9. That API route mints a LiveKit JWT token server-side using `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`.
10. The meeting client receives `token`, `roomName`, `participantName`, and `wsUrl`.
11. The LiveKit client SDK connects the browser to the LiveKit server.
12. LiveKit is supposed to send room lifecycle webhooks back to the Next.js app, but the VM is currently configured to target `localhost:3000`, where no service is listening.
13. Recording webhook handling also exists in the app, but current recording start is disabled in code, and the VM's recording webhook target is also broken for the same reason.

## 2.3 The most important boundary

The system boundary that matters most is:

- Live media plane: on the Oracle VM
- application control plane: in the Next.js app

That means:

- calls depend on the VM being up and reachable
- room creation and token minting depend on the app env being correct
- webhook-driven lifecycle sync depends on the VM being able to reach a running Next.js server

---

## 3. Oracle VM: Current Verified State

## 3.1 Host identity

Verified host details:

- SSH target: `ubuntu@140.245.251.150`
- hostname: `instance-20250914-2351`
- OS: Ubuntu `22.04.5 LTS`
- kernel family: Oracle Ubuntu kernel (`6.8.0-1033-oracle`)
- region from OCI metadata: `ap-hyderabad-1`
- availability domain: `FKkE:AP-HYDERABAD-1-AD-1`
- OCI shape: `VM.Standard.E2.1.Micro`
- private IP: `10.0.0.157`

## 3.2 Size and resource profile

Verified machine profile:

- `2` CPU threads visible
- about `956 MiB` RAM
- `2 GiB` swap
- root disk about `45G`

Observed on 2026-03-31:

- load average: `3.52`, `2.38`, `1.09`
- swap in use
- `kswapd0` active
- CPU steal time was high
- memory pressure exists

This matters because:

- the VM is small
- recording/compositing is expensive
- this matches the decision to keep recording disabled in the app

## 3.3 Filesystem layout on the VM

Top-level relevant paths on the VM:

- `/home/ubuntu/livekit`
- `/etc/livekit-egress.yaml`
- `/etc/systemd/system/livekit.service`
- `/etc/systemd/system/livekit-egress.service`
- `/home/ubuntu/ngrok.log`
- `/home/ubuntu/.config/ngrok/ngrok.yml`
- `/tmp/egress`

Contents of `/home/ubuntu/livekit`:

- `livekit-server` binary
- `livekit.yaml`
- `production-keys.txt`
- `livekit_1.9.1_linux_amd64.tar.gz`
- `LICENSE`

Important meaning:

- this directory contains the real deployed LiveKit server binary and config
- it also contains a plaintext production credential file
- there is no Next.js app deployed in this directory
- there is no token server code deployed in this directory

## 3.4 What is actually running

Verified long-running processes:

- `livekit-server --config /home/ubuntu/livekit/livekit.yaml`
- `ngrok http --log=stdout 7880`
- Docker daemon
- Redis container
- LiveKit Egress container

Verified `systemd` services:

- `livekit.service`
- `livekit-egress.service`
- `docker.service`

Not present as services:

- no Next.js service
- no token server service
- no `ngrok` service

## 3.5 LiveKit server service

Verified `livekit.service` behavior:

- unit file path: `/etc/systemd/system/livekit.service`
- enabled on boot
- runs as user `ubuntu`
- working directory: `/home/ubuntu/livekit`
- executable: `/home/ubuntu/livekit/livekit-server`
- config file: `/home/ubuntu/livekit/livekit.yaml`
- restart policy: `Restart=always`
- restart delay: `RestartSec=10`
- `NoNewPrivileges=true`
- `PrivateTmp=true`
- `LimitNOFILE=65536`

Verified binary version:

- `livekit-server version 1.9.1`

## 3.6 LiveKit server config

Verified values from `/home/ubuntu/livekit/livekit.yaml`:

- port: `7880`
- bind address: `0.0.0.0`
- TCP fallback port: `7881`
- UDP media port range: `50000-60000`
- `use_external_ip: true`
- `node_ip: 140.245.251.150`
- STUN servers:
  - `stun.l.google.com:19302`
  - `stun1.l.google.com:19302`
- `use_ice_lite: true`
- Redis address: `127.0.0.1:6379`
- room auto-create: `true`
- room max participants: `10`
- empty timeout: `300`
- departure timeout: `20`
- logging level: `info`
- logging sample: `true`
- `pion_level: warn`

Webhook section in current `livekit.yaml`:

- room webhooks target: `http://localhost:3000/api/livekit/webhook/room-events`
- webhook API key is present in config

Critical consequence:

- the VM expects something local on port `3000` to receive room webhooks
- no such process exists right now
- room webhooks are failing

## 3.7 Redis on the VM

Verified Redis state:

- running as Docker container
- image: `redis:7-alpine`
- bound only to `127.0.0.1:6379`
- not exposed publicly
- version from `redis-cli INFO`: `7.4.6`

Purpose:

- LiveKit server uses Redis
- Egress also connects to the same Redis instance

## 3.8 Egress on the VM

Verified Egress state:

- managed by `systemd` as `livekit-egress.service`
- container image: `livekit/egress:v1.9.1`
- service enabled on boot
- Docker runs it with `--network host`
- config mounted from `/etc/livekit-egress.yaml`
- temp output mounted to `/tmp/egress`

Verified `livekit-egress.service` execution model:

- `ExecStartPre` stops and removes any prior `livekit-egress` container
- creates `/tmp/egress`
- launches Docker container in host network mode

Verified ports related to Egress:

- `127.0.0.1:7980`
- `*:9090`

Verified Egress config in `/etc/livekit-egress.yaml`:

- API key present
- API secret present
- `ws_url` present
- health port: `9090`
- webhook target:
  - `http://localhost:3000/api/livekit/webhook/recording`
- file output directory:
  - `/tmp/egress`
- Redis address:
  - `127.0.0.1:6379`
- CPU cost settings configured

Critical consequence:

- Egress also expects something local on port `3000`
- no such process exists
- recording webhooks are also broken

## 3.9 What Egress is actually doing

Verified from Egress logs and `/tmp/egress`:

- Egress is operational
- it has accepted `room_composite` requests in the past
- it has connected to Redis successfully
- it has produced actual recording artifacts on disk

Verified artifact found:

- `/tmp/egress/sessions/1f769d1d-d026-4a6c-9b80-c65ceccf1c6c/2025-10-20T141848.ogg`
- matching metadata file:
  - `/tmp/egress/sessions/1f769d1d-d026-4a6c-9b80-c65ceccf1c6c/EG_Qywgj8Zmyi5q.json`

Verified facts from logs:

- there were successful Egress runs in October 2025
- some requests were `audio_only: true`
- older logs also show failures such as:
  - high CPU
  - "Can't record audio fast enough"
  - "pipeline frozen"

Meaning:

- recording infrastructure exists
- it has been exercised before
- this VM is not a comfortable recording box

## 3.10 `ngrok` on the VM

Verified `ngrok` facts:

- binary path: `/usr/local/bin/ngrok`
- version: `3.30.0`
- config file:
  - `/home/ubuntu/.config/ngrok/ngrok.yml`
- current config file only contains the agent auth token
- tunnel is not defined in config
- tunnel is started manually via CLI

Verified startup method from shell history:

- `ngrok http 7880`
- `nohup ngrok http --log=stdout 7880 > ~/ngrok.log 2>&1 &`

Verified current tunnel:

- public URL: `https://fragile-killian-unmutualized.ngrok-free.dev`
- target: `http://localhost:7880`

Verified local inspect API:

- `127.0.0.1:4040`

Operational meaning:

- `ngrok` is forwarding HTTPS traffic to LiveKit port `7880`
- it is not managed by `systemd`
- it is vulnerable to being lost on reboot unless manually restarted by some external action

## 3.11 Network listeners and exposure

Verified listeners on the VM:

- `*:7880` LiveKit
- `*:7881` LiveKit
- `127.0.0.1:4040` `ngrok` inspect API
- `127.0.0.1:6379` Redis
- `127.0.0.1:7980` Egress internal
- `*:9090` Egress health
- `*:22` SSH

Verified by external checks:

- `http://140.245.251.150:7880/` returns `OK`
- `https://fragile-killian-unmutualized.ngrok-free.dev/` returns `OK`
- public TCP connect to `140.245.251.150:7881` succeeds

Important conclusion:

- the VM is directly publicly reachable by raw IP on LiveKit ports
- `ngrok` is providing HTTPS/WSS convenience, not basic reachability

## 3.12 Guest firewall on the VM

Verified guest firewall state:

- `iptables` is in use
- `ufw` is not installed
- `nft` is not installed

Verified allowed inbound rules:

- `22/tcp`
- `7880/tcp`
- `7881/tcp`
- `3478/udp`
- `50000:60000/udp`

Important nuance:

- `3478/udp` is allowed in firewall rules
- there was no corresponding listening process observed on `3478`
- this is firewall allowance, not proof of active TURN/STUN service

## 3.13 Current logs on the VM

Verified LiveKit logs show:

- successful `RoomService.CreateRoom` calls for room names like `session-<uuid>`
- repeated webhook failures for:
  - `room_started`
  - `room_finished`
- failure reason:
  - `dial tcp 127.0.0.1:3000: connect: connection refused`

Verified time range:

- this webhook failure pattern has been happening since at least `2026-01-04`
- verified examples also exist on:
  - `2026-01-09`
  - `2026-01-10`
  - `2026-01-18`
  - `2026-01-25`
  - `2026-02-12`

Verified March log pattern:

- mostly `pion.tcp_mux` warnings such as:
  - buffer too small
  - invalid magic cookie
  - unexpected EOF

Interpretation:

- the VM is exposed enough that random/non-WebRTC traffic is hitting `7881`
- this is common noise for public media ports

## 3.14 Docker footprint on the VM

Verified:

- `/var/lib/docker` size around `7.3G`
- images present:
  - `livekit/egress:v1.9.1`
  - `livekit/egress:latest`
  - `redis:7-alpine`

## 3.15 Secret storage on the VM

Verified secret-bearing files:

- `/home/ubuntu/livekit/production-keys.txt`
- `/home/ubuntu/livekit/livekit.yaml`
- `/etc/livekit-egress.yaml`
- `/home/ubuntu/.config/ngrok/ngrok.yml`

Verified permission state:

- `/home/ubuntu/livekit/production-keys.txt` -> mode effectively `664`
- `/home/ubuntu/livekit/livekit.yaml` -> mode effectively `664`
- `/etc/livekit-egress.yaml` -> mode effectively `644`
- `/home/ubuntu/.config/ngrok/ngrok.yml` -> mode effectively `600`

Security meaning:

- LiveKit and production key files are readable by any local user on the VM
- the `ngrok` config is the only one among these with tight permissions

---

## 4. What the VM Is Not Running

These things were explicitly checked and were **not** found on the VM:

- no Next.js app process
- no `node`/`pnpm`/`npm` app server bound to `3000`
- no token server bound to `3000`
- no token server bound to `5555`
- no `systemd` unit for `ngrok`
- no separate app repository deployed under `/home/ubuntu/livekit`

This is critical because both LiveKit and Egress configs expect a webhook receiver on `localhost:3000`.

---

## 5. Next.js Repository: Current Verified LiveKit Implementation

Repository root:

- `C:\Users\Dell\Desktop\Play\YM\young-minds-landing-page`

The LiveKit implementation in this repo is real and substantial. It is not just a mock or a plan.

## 5.1 Runtime env values currently present in `.env.local`

Verified current local env entries:

- `NEXT_PUBLIC_LIVEKIT_WS_URL=ws://140.245.251.150:7880`
- `LIVEKIT_API_KEY=<present>`
- `LIVEKIT_API_SECRET=<present>`
- `LIVEKIT_WS_URL=http://140.245.251.150:7880`
- `NEXT_PUBLIC_APP_URL=http://localhost:3000`

Important observations:

- the checked-in local env points to the VM's raw IP
- it does not point to the current `ngrok` URL
- the server-side LiveKit URL is `http://...`, not `ws://...`
- the public client-side LiveKit URL is `ws://...`
- `NEXT_PUBLIC_APP_URL` is `http://localhost:3000`

Important inference:

- if the real production web app is running over HTTPS and video calls work, the production deployment is likely using a different env value than the checked-in `.env.local`, because the local value would be upgraded to `wss://140.245.251.150:7880` by the client on an HTTPS page, and the VM does not expose TLS on `7880`

## 5.2 Core config file

Primary file:

- `lib/livekit/config.ts`

What it defines:

- required server envs:
  - `LIVEKIT_API_KEY`
  - `LIVEKIT_API_SECRET`
  - `LIVEKIT_WS_URL`
- lazy runtime getter for `NEXT_PUBLIC_LIVEKIT_WS_URL`
- room naming rules
- participant identity rules
- token TTL and grants
- meeting time windows

Verified key behavior:

- room names are `session-{uuid}`
- participant identities are `{role}-{userId}`
- token TTL is `24 hours`
- grants allow:
  - room join
  - publish
  - subscribe
  - publish data
- meeting early join window: `15 minutes`
- meeting late join window: `2 hours`

Important nuance:

- `livekitConfig.webhook.secret` exists in config, but current webhook verification code does not use it

## 5.3 Room creation implementation

Primary file:

- `lib/livekit/room-manager.ts`

What it does:

- builds a `RoomServiceClient`
- creates real LiveKit rooms on the LiveKit server
- creates DB room records
- creates DB participant records
- stores audit events
- generates meeting URL
- mints access tokens for participants
- marks rooms ended

Verified room creation flow:

1. Validate the session exists.
2. Refuse duplicate room creation if a DB room already exists.
3. Generate the room name `session-{sessionId}`.
4. Call `roomService.createRoom(...)` against the LiveKit server.
5. Insert a `livekit_rooms` record.
6. Insert `livekit_participants` rows for mentor and mentee.
7. Log an audit event.
8. Return `roomId`, `roomName`, and `meetingUrl`.

Verified cleanup behavior:

- if LiveKit room creation succeeds but DB insert fails, the code attempts to delete the just-created LiveKit room

Room metadata sent to LiveKit includes:

- `sessionId`
- `sessionTitle`
- `scheduledAt`

Participant records are initialized with:

- role
- participant identity
- `accessToken: 'pending'`
- token expiry
- user metadata

Important nuance:

- `livekitRooms.recordingEnabled` is currently written as `false` when a room is created
- recording start logic does **not** rely on that field; it checks the session's recording config and then also exits early due the global temp-disable flag

## 5.4 Booking flow integration

Primary file:

- `app/api/bookings/route.ts`

Verified behavior:

- after a booking is created, the booking route tries to create the LiveKit room
- this happens inline in the booking flow
- if room creation fails, the booking is still considered valid
- the code logs the failure loudly and expects manual intervention

This means:

- video room creation is intended to happen automatically at booking time
- room creation is not left exclusively to a later manual process

## 5.5 Manual room repair endpoint

Primary file:

- `app/api/sessions/[sessionId]/livekit/create-room/route.ts`

Purpose:

- manually create a missing room for an existing session

Verified behavior:

- requires authenticated user with roles
- allows admin or session participant
- validates UUID
- calls `LiveKitRoomManager.createRoomForSession(...)`

This is the runtime API equivalent of "repair a missing room."

## 5.6 Access-token minting endpoint

Primary file:

- `app/api/sessions/[sessionId]/livekit/access-token/route.ts`

This is the token minting path currently used by the meeting page.

Verified behavior:

- requires auth session
- validates UUID
- calls `LiveKitRoomManager.generateAccessToken(sessionId, userId)`
- returns:
  - `token`
  - `roomName`
  - `participantName`
  - `wsUrl`
  - `expiresAt`

This is the canonical proof that token minting lives in this Next.js app.

## 5.7 How tokens are actually minted

Still in `lib/livekit/room-manager.ts`.

Verified token minting details:

- uses `new AccessToken(apiKey, apiSecret, ...)`
- identity is the DB participant identity
- participant name comes from user name or email
- grant room is the DB room name
- token metadata contains:
  - `userId`
  - `role`
  - `sessionId`
- token is converted to JWT with `token.toJwt()`
- the generated token is stored back in `livekit_participants.accessToken`

Return payload from the token generator includes:

- the JWT
- the room name
- participant display name
- the public LiveKit URL from `getPublicWsUrl()`

## 5.8 Meeting page server-side gate

Primary file:

- `app/meeting/[sessionId]/page.tsx`

Verified checks before rendering the meeting UI:

- user must be authenticated
- session must exist
- user must be mentor or mentee on that session
- meeting must not be too early
- meeting must not be too late
- a `livekit_rooms` DB record must exist

Current time-window rules:

- can join `15 minutes` before scheduled time
- can join until `2 hours` after scheduled time

If any of these fail:

- the page returns a fully rendered error/blocked UI instead of trying to connect

## 5.9 Meeting client behavior

Primary file:

- `app/meeting/[sessionId]/MeetingRoom.tsx`

Verified meeting client flow:

- fetch `/api/sessions/[sessionId]/livekit/access-token`
- validate returned data has `token`, `wsUrl`, and `roomName`
- if page is on HTTPS and `wsUrl` starts with `ws://`, upgrade it to `wss://`
- render LiveKit pre-join lobby
- connect to LiveKit room after user clicks "Join Meeting"

Verified client-side recording indicator behavior:

- the meeting UI polls `/api/sessions/[sessionId]/recordings`
- if any recording is `in_progress`, it shows "Recording in Progress"
- polling interval is `30 seconds`

Important consequence:

- the recording badge is driven by DB state, not by direct LiveKit room state

## 5.10 Room ending endpoint

Primary file:

- `app/api/sessions/[sessionId]/livekit/end-room/route.ts`

Purpose:

- mark a room ended for session completion/cancellation flows

Verified behavior:

- requires auth and role guard
- allows admin or participant
- validates UUID
- calls `LiveKitRoomManager.endRoom(sessionId)`

Important nuance:

- this code updates DB room/participant status
- it is not a direct call to terminate the actual LiveKit room on the server

## 5.11 Webhook verification implementation

Primary file:

- `lib/livekit/webhook.ts`

Verified behavior:

- reads raw request body
- reads `Authorization` or `Authorize` header
- strips `Bearer ` if present
- constructs `WebhookReceiver(apiKey, apiSecret)`
- calls `receiver.receive(rawBody, authHeader)`

Critical nuance:

- verification uses `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`
- it does **not** use `LIVEKIT_WEBHOOK_SECRET`

Practical consequence:

- `LIVEKIT_WEBHOOK_SECRET` currently exists as config metadata only
- changing it would not change runtime webhook verification unless code is updated

## 5.12 Room-events webhook route

Primary file:

- `app/api/livekit/webhook/room-events/route.ts`

Verified supported room event types:

- `room_started`
- `room_finished`
- `participant_joined`
- `participant_left`
- `track_published`
- `track_unpublished`

Verified behavior:

- verifies webhook signature
- parses payload
- handles room lifecycle events
- also contains support for `egress*` events in camelCase payload form

Room-event handling logic:

- `room_started` -> try `startRecording(sessionId)`
- `room_finished` -> try `stopRecording(sessionId)`
- `participant_joined` -> fallback attempt to start recording when first participant joins
- `participant_left` -> logs only

Important consequence:

- room lifecycle is intended to trigger recording automatically
- but current recording start is globally disabled in code, so these calls short-circuit

## 5.13 Recording webhook route

Primary file:

- `app/api/livekit/webhook/recording/route.ts`

Verified supported event types:

- `egress_started`
- `egress_ended`
- `egress_failed`

Verified payload expectation:

- snake_case `egress_info`

This differs from the room-events route's extra egress handler, which expects camelCase `egressInfo`.

Verified `egress_ended` workflow in current code:

1. find recording row by `recordingSid`
2. read file info from webhook payload
3. read the file from local disk using `fs`
4. upload the file to storage using the configured storage provider
5. update DB status and metadata
6. insert audit event
7. delete local file from disk

Critical architectural consequence:

- this handler assumes the Next.js server processing the webhook can access the Egress output file path on local disk
- that only works if the app handling the webhook has access to the VM filesystem or the same local path

This is extremely important because:

- the Oracle VM is currently not running the Next.js app
- therefore the current recording webhook design is not physically compatible with a webhook receiver hosted somewhere else

## 5.14 Recording manager

Primary file:

- `lib/livekit/recording-manager.ts`

Verified current global flag:

- `RECORDING_TEMP_DISABLED = true`

Current consequence:

- `startRecording(sessionId)` returns early and does not call Egress

What the code would do if enabled:

- check the session exists
- check session recording config
- find the room
- guard against duplicate active recordings
- generate an Egress JWT using the LiveKit API key/secret
- call `/twirp/livekit.Egress/StartRoomCompositeEgress`
- create `livekit_recordings` DB row
- insert `livekit_events` audit row

Current request shape in code if recording were enabled:

- `audio_only: true`
- `preset: H264_432P_30`
- file path:
  - `/tmp/egress/sessions/${sessionId}/{time}.ogg`

Important historical nuance:

- VM logs from October 2025 show older Egress requests using `.mp4` even with `audio_only: true`
- current repo code now targets `.ogg`
- therefore the repo code and VM historical logs are from different implementation moments

Stop-recording behavior in code:

- calls `/twirp/livekit.Egress/StopEgress`
- expects webhook-driven completion afterward

Playback behavior in code:

- `getPlaybackUrl(recordingId, userId)` authorizes mentor/mentee only
- requires recording status `completed`
- uses storage provider to generate 1-hour playback URL

## 5.15 Recordings list and playback surfaces

Primary files:

- `app/api/sessions/[sessionId]/recordings/route.ts`
- `app/api/recordings/[id]/playback-url/route.ts`
- `app/recordings/[id]/page.tsx`
- `app/recordings/[id]/RecordingPlayer.tsx`

Verified behavior of recordings list route:

- requires auth
- checks the user is mentor or mentee of the session
- enforces subscription action:
  - `recordings.access.mentor` or `recordings.access.mentee`
- returns recording metadata only
- does not return playback URLs

Verified behavior of playback URL route:

- requires auth
- loads recording -> room -> session
- enforces subscription feature access
- delegates URL generation to `getPlaybackUrl(...)`
- returns signed URL + 1-hour expiry

Verified playback page behavior:

- blocks unauthorized users
- blocks failed recordings
- blocks incomplete recordings
- renders the client player only when status is `completed`

Verified player behavior:

- fetches signed playback URL from the API
- displays HTML5 video player
- shows session metadata
- offers client-side download using the signed URL

Important nuance:

- the player currently names downloads `${sessionTitle}.mp4`
- current recording manager code, if enabled, would produce audio-only `.ogg`
- this is another small contract mismatch

## 5.16 LiveKit database schema

Primary file:

- `lib/db/schema/livekit.ts`

Verified tables:

- `livekit_rooms`
- `livekit_participants`
- `livekit_events`
- `livekit_recordings`

Verified room statuses:

- `pending`
- `active`
- `ended`
- `failed`

Verified participant roles:

- `mentor`
- `mentee`

Verified participant statuses:

- `invited`
- `joined`
- `left`
- `kicked`

Verified important schema facts:

- one `livekit_rooms` row per session
- `roomName` is unique
- `roomSid` exists for server-assigned SID
- participants are unique per room/user pair
- participant rows persist minted access tokens and expiry
- events table stores audit trail and optional webhook dedupe id
- recordings table stores storage provider, path, playback URL, size, duration, status, and metadata

## 5.17 Storage layer

Primary files:

- `lib/livekit/storage/storage-factory.ts`
- `lib/livekit/storage/supabase-storage.provider.ts`
- `lib/livekit/storage/s3-storage.provider.ts`

Verified current factory behavior:

- `STORAGE_PROVIDER` defaults to `supabase`
- only `supabase` is implemented
- `s3`, `gcs`, and `azure` are declared as possible but not implemented

Verified current Supabase provider behavior:

- requires:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY`
  - `SUPABASE_STORAGE_BUCKET`
- uploads recordings to the configured bucket
- creates signed playback URLs
- can delete recordings

Verified S3 provider status:

- placeholder only
- throws "not yet implemented"

## 5.18 LiveKit support scripts and docs in the repo

LiveKit-specific repo docs/scripts observed:

- `LIVEKIT_TESTING_GUIDE.md`
- `LIVEKIT_IMPLEMENTATION_STATUS.md`
- `LIVEKIT_BUGFIX_GUIDE.md`
- `RECORDING_IMPLEMENTATION_GUIDE.md`
- `RECORDING_IMPLEMENTATION_COMPLETE.md`
- `scripts/test-livekit-connection.ts`
- `scripts/fix-existing-rooms.ts`

Meaning:

- the implementation was built iteratively
- several documents describe earlier phases of the rollout
- they are useful history, but not all current details in them still match the current system

Historical support script roles:

- `scripts/test-livekit-connection.ts`
  - verifies API connectivity to LiveKit
  - can create/delete a test room
- `scripts/fix-existing-rooms.ts`
  - repairs DB rooms that exist in Postgres but not on the LiveKit server

---

## 6. Local Helper Folder: `C:\Users\Dell\Desktop\Play\YM\livekit`

This folder is not the canonical runtime implementation. It is a mixed workspace of:

- early LiveKit prototypes
- helper scripts
- HTML test pages
- docs
- logs
- SSH access material
- local token-server experiments
- copied artifacts

## 6.1 Top-level inventory

Observed top-level contents:

- `.claude/`
- `2025-10-20T141848.ogg`
- `IMPLEMENTATION_GUIDE.md`
- `Untitled-1.yaml`
- `app.html`
- `context.txt`
- `deploy-token-server.sh`
- `fix_bigint_columns.sql`
- `generate-multiple-tokens.js`
- `generate-token.js`
- `index-module.html`
- `index.html`
- `local.html`
- `logs.txt`
- `migrations/`
- `node_modules/`
- `package-lock.json`
- `package.json`
- `schema.sql`
- `server.js`
- `simple.html`
- `ssh-key-2025-09-14.key`
- `ssh-key-2025-09-14.key.pub`
- `test-livekit.html`
- `token-server.js`

## 6.2 What `package.json` in the helper folder means

Verified helper-folder package metadata:

- project name: `livekit-mentor-mentee`
- scripts:
  - `start` -> `node server.js`
  - `start-old` -> `node token-server.js`

This is not the Next.js app and is not what the current production system uses for tokens.

## 6.3 `server.js` in the helper folder

Verified behavior:

- Express server
- port `5555`
- hardcoded `API_KEY='devkey'`
- hardcoded `API_SECRET='secret'`
- serves static test pages
- POST `/token`
- role metadata inferred from participant name containing `"Mentor"`

Conclusion:

- this is a prototype/dev token server
- it is not compatible with the current production LiveKit keys
- it is not what the current app uses

## 6.4 `token-server.js` in the helper folder

Verified behavior:

- plain Node HTTP server
- port `5555`
- hardcoded `devkey/secret`
- POST `/token`
- same mentor-name heuristic for metadata

Conclusion:

- this is an older even simpler token-server prototype
- not current production path

## 6.5 `deploy-token-server.sh` in the helper folder

Verified behavior:

- intended to run on Oracle VM
- installs Node if needed
- creates `~/token-server/server.js`
- uses hardcoded `devkey/secret`
- binds to `0.0.0.0:3000`
- opens iptables for port `3000`

Important meaning:

- this explains why port `3000` shows up in older design notes
- it is not what is running today
- current VM iptables did not show a port `3000` allow rule from this script
- current VM has no token server process on `3000`

## 6.6 Token generator scripts in the helper folder

Verified files:

- `generate-token.js`
- `generate-multiple-tokens.js`

Verified behavior:

- both use hardcoded `devkey/secret`
- both generate long-lived wildcard room tokens
- `generate-token.js` creates one 1-year token for room `*`
- `generate-multiple-tokens.js` prints multiple 1-year wildcard tokens

Conclusion:

- these are local dev/test utilities only
- they are not valid production implementation for the current VM

## 6.7 Helper-folder docs and artifacts

`IMPLEMENTATION_GUIDE.md` in the helper folder:

- describes a staged LiveKit rollout
- includes a historical architecture that routes token generation through a token service on the VM
- parts of it are superseded by the current Next.js implementation

`context.txt` in the helper folder:

- contains a local browser/device error:
  - `NotFoundError`
  - `"Requested device not found"`

`logs.txt` in the helper folder:

- contains local app logs related to recordings
- includes a historical Next.js dynamic params bug in `app/api/sessions/[sessionId]/recordings/route.ts`
- current repository code already awaits `context.params`, so that specific issue is now fixed

`Untitled-1.yaml` in the helper folder:

- contains a snippet for creating `/etc/ngrok/ngrok.yml`
- includes a real `ngrok` auth token in plaintext
- uses config format `version: "2"`

Important meaning:

- this helper folder contains additional secret material and should be treated as sensitive
- it also preserves historical setup attempts

## 6.8 Copied recording artifact

Verified file:

- `C:\Users\Dell\Desktop\Play\YM\livekit\2025-10-20T141848.ogg`

This matches the timestamp of the artifact found on the VM in `/tmp/egress/...`.

Observed fact:

- the helper folder contains a copied recording artifact from the Egress system

---

## 7. Cross-System Secret and Config Matching

The following cross-system relationships were verified:

- the Next.js repo's current `.env.local` LiveKit API key/secret match the production key material observed on the VM
- the same LiveKit API key/secret values also appear in historical repo docs
- a `LIVEKIT_WEBHOOK_SECRET` value also appears in historical repo docs and on the VM key file

Important nuance:

- matching presence of the webhook secret does not imply runtime usage
- current webhook code verifies using API key/secret, not the separate webhook secret

This means the systems are sharing LiveKit credentials, but the webhook-secret concept is currently more documented than actually enforced in code.

---

## 8. Current Mismatches, Gaps, and Risks

This section is the most important operationally.

## 8.1 Webhook target mismatch on the VM

Verified:

- LiveKit room webhooks target `http://localhost:3000/api/livekit/webhook/room-events`
- Egress webhooks target `http://localhost:3000/api/livekit/webhook/recording`
- nothing listens on `localhost:3000` on the VM

Consequence:

- room lifecycle webhooks are failing
- recording lifecycle webhooks are failing

## 8.2 Repo env vs live production tunnel mismatch

Verified:

- checked-in `.env.local` uses raw VM IP
- current live `ngrok` URL exists only on the VM
- there are no runtime `ngrok` references in the app code

Inference:

- the actually deployed Next.js environment, if video calling works over HTTPS today, must be using different env values from the local `.env.local`

## 8.3 Recording architecture mismatch

Verified:

- app-side recording webhook expects to read a local filesystem path with `fs`
- Egress writes files on the VM
- the VM is not running the Next.js app

Consequence:

- a remote Next.js deployment cannot process recording files from `/tmp/egress` without some additional shared filesystem, SSH mount, copy step, or co-location on the VM

## 8.4 Recording disabled in code but infrastructure still active

Verified:

- `RECORDING_TEMP_DISABLED = true` in the app code
- Egress is running on the VM
- Egress has written real files in the past

Consequence:

- recording is turned off by application logic, not removed from infrastructure
- stray or manual Egress activity can still happen on the VM

## 8.5 Public direct exposure of LiveKit

Verified:

- raw IP `140.245.251.150:7880` responds publicly
- raw IP `140.245.251.150:7881` is open publicly

Consequence:

- the VM is not shielded behind `ngrok` only
- scanners and non-WebRTC traffic hit the media port directly

## 8.6 `ngrok` startup fragility

Verified:

- no `systemd` service for `ngrok`
- started with `nohup`
- `ngrok.log` shows reconnect and heartbeat timeout events

Consequence:

- tunnel continuity depends on a manually started background process

## 8.7 Secret storage risk

Verified:

- plaintext production keys exist on disk on the VM
- livekit config files have weak file permissions
- the helper folder contains a real SSH private key and a real `ngrok` token snippet

Consequence:

- secrets are spread across multiple local and remote locations
- at least some are protected weakly

## 8.8 `LIVEKIT_WEBHOOK_SECRET` is effectively unused

Verified:

- config exposes it
- runtime webhook verification does not consume it

Consequence:

- changing the webhook secret alone would not secure or change current webhook auth behavior

## 8.9 Historical doc/config drift

Verified examples of drift:

- helper-folder docs describe a token service on the VM
- current production token minting is in Next.js
- `RECORDING_IMPLEMENTATION_COMPLETE.md` talks about `172.17.0.1:3000`
- current VM Egress config uses `localhost:3000`
- helper-folder `Untitled-1.yaml` uses `ngrok` config version `2`
- current VM `ngrok` config is version `3`

Consequence:

- older docs are helpful context but not safe as a source of current truth

## 8.10 UI/product expectation drift

Verified:

- recording-related UI and API surfaces exist
- meeting UI has a recording indicator
- recording pages and playback flows exist
- app currently disables recording start globally

Consequence:

- parts of the product surface imply a recording system that is not truly active end-to-end right now

---

## 9. What Is Current Truth vs What Is Historical

## 9.1 Current truth

Current truth means directly supported by current code and current VM state:

- rooms are created from the Next.js app
- tokens are minted from the Next.js app
- LiveKit runs on the Oracle VM
- Redis runs on the Oracle VM
- Egress runs on the Oracle VM
- `ngrok` fronts LiveKit port `7880`
- webhooks currently fail because the VM has no local `3000` receiver
- recording is disabled by app code

## 9.2 Historical but still present

Historical items still present in docs/scripts/folders:

- prototype token servers on `5555`
- deploy script for a VM token server on `3000`
- docs that assume Next.js or a token server is on the VM
- old recording webhook routes/notes built around local filesystem access
- helper HTML pages for manual browser testing

These are useful for understanding how the system evolved, but they are not the current deployed control path.

---

## 10. Canonical File Map

This section is the concise "where is what" map for a developer.

## 10.1 Primary repo runtime files

- `lib/livekit/config.ts`
  - central LiveKit env/config rules
- `lib/livekit/room-manager.ts`
  - room creation, token minting, room ending
- `lib/livekit/recording-manager.ts`
  - recording start/stop/playback logic
- `lib/livekit/webhook.ts`
  - webhook verification
- `lib/db/schema/livekit.ts`
  - DB schema for rooms/participants/events/recordings
- `app/api/bookings/route.ts`
  - booking flow creates rooms
- `app/api/sessions/[sessionId]/livekit/create-room/route.ts`
  - manual room creation/repair endpoint
- `app/api/sessions/[sessionId]/livekit/access-token/route.ts`
  - token minting endpoint
- `app/api/sessions/[sessionId]/livekit/end-room/route.ts`
  - mark room ended
- `app/api/livekit/webhook/room-events/route.ts`
  - room lifecycle webhook endpoint
- `app/api/livekit/webhook/recording/route.ts`
  - Egress/recording webhook endpoint
- `app/api/sessions/[sessionId]/recordings/route.ts`
  - recordings list endpoint
- `app/api/recordings/[id]/playback-url/route.ts`
  - signed playback URL endpoint
- `app/meeting/[sessionId]/page.tsx`
  - server-side meeting gate
- `app/meeting/[sessionId]/MeetingRoom.tsx`
  - client-side meeting UI
- `app/recordings/[id]/page.tsx`
  - playback page
- `app/recordings/[id]/RecordingPlayer.tsx`
  - playback client
- `lib/livekit/storage/storage-factory.ts`
  - storage provider selection
- `lib/livekit/storage/supabase-storage.provider.ts`
  - implemented storage provider
- `lib/livekit/storage/s3-storage.provider.ts`
  - future stub only

## 10.2 Primary VM runtime files

- `/home/ubuntu/livekit/livekit-server`
  - actual LiveKit server binary
- `/home/ubuntu/livekit/livekit.yaml`
  - actual LiveKit server config
- `/home/ubuntu/livekit/production-keys.txt`
  - plaintext credential file
- `/etc/systemd/system/livekit.service`
  - LiveKit service unit
- `/etc/livekit-egress.yaml`
  - Egress config
- `/etc/systemd/system/livekit-egress.service`
  - Egress service unit
- `/home/ubuntu/.config/ngrok/ngrok.yml`
  - `ngrok` auth config
- `/home/ubuntu/ngrok.log`
  - `ngrok` runtime log
- `/tmp/egress`
  - local Egress output directory

## 10.3 Primary local helper-folder files

- `C:\Users\Dell\Desktop\Play\YM\livekit\server.js`
  - prototype token/static server
- `C:\Users\Dell\Desktop\Play\YM\livekit\token-server.js`
  - older prototype token server
- `C:\Users\Dell\Desktop\Play\YM\livekit\deploy-token-server.sh`
  - historical VM token-server deploy script
- `C:\Users\Dell\Desktop\Play\YM\livekit\generate-token.js`
  - dev token generator
- `C:\Users\Dell\Desktop\Play\YM\livekit\generate-multiple-tokens.js`
  - dev bulk token generator
- `C:\Users\Dell\Desktop\Play\YM\livekit\IMPLEMENTATION_GUIDE.md`
  - historical rollout guide
- `C:\Users\Dell\Desktop\Play\YM\livekit\logs.txt`
  - local recording-related app logs
- `C:\Users\Dell\Desktop\Play\YM\livekit\ssh-key-2025-09-14.key`
  - SSH private key used to access the VM

---

## 11. Final No-Assumption Conclusions

These are the strongest conclusions that can be stated from direct evidence.

1. The Oracle VM is currently a LiveKit node, not a full application server.
2. The Next.js app in this repo is the current room-creation and token-minting authority.
3. The Next.js app contains both room-event and recording webhook handlers.
4. The VM is currently configured to send those webhooks to `localhost:3000`, where nothing is listening.
5. Therefore webhook-driven synchronization is currently broken on the VM.
6. `ngrok` is currently being used to expose LiveKit over HTTPS/WSS, but the checked-in local env does not reflect that URL.
7. Recording infrastructure exists on the VM and has worked before, but current app code disables recording start.
8. The current app-side recording webhook design assumes filesystem access to the Egress output path and therefore does not naturally fit a remote-only Next.js deployment.
9. The local helper folder is useful historical context and tooling, but it is not the authoritative current implementation.
10. Real secrets exist in both local and remote places and are not stored safely enough.

---

## 12. What a Junior Developer Should Trust First

If a junior developer has to debug or extend this system, the correct order of trust is:

1. This document
2. Current runtime code in:
   - `lib/livekit/*`
   - `app/api/sessions/[sessionId]/livekit/*`
   - `app/api/livekit/webhook/*`
   - `app/meeting/[sessionId]/*`
   - `app/api/sessions/[sessionId]/recordings/route.ts`
   - `app/api/recordings/[id]/playback-url/route.ts`
3. Current VM configs:
   - `/home/ubuntu/livekit/livekit.yaml`
   - `/etc/livekit-egress.yaml`
   - current process list
   - current `systemd` units
4. Historical docs/scripts only after confirming they still match runtime

The junior developer should **not** start from the helper-folder token servers or old rollout docs and assume those are current.

---

## 13. External Unknowns That Are Still Outside This Document

This document is exhaustive for what was directly observable, but the following are genuinely outside the verified boundary:

- the real production env vars of the deployed Next.js server, if separate from this workspace
- any Vercel/Railway/other hosting dashboard config
- any external DNS or reverse proxy config outside the VM
- OCI network security list / NSG rules outside guest `iptables`

These are the only major areas where additional facts may still exist outside this document.

Everything else currently observable from this repository, the Oracle VM, and the local helper folder is captured above.
