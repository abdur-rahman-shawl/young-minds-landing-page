DROP POLICY IF EXISTS "access_policy_configs_no_client_access"
  ON "access_policy_configs";

CREATE POLICY "access_policy_configs_no_client_access"
  ON "access_policy_configs"
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);
