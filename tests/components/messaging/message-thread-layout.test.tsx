/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MessageThreadLayout } from '@/components/messaging/message-thread-layout';

describe('MessageThreadLayout', () => {
  it('keeps the header and composer fixed while the body owns scrolling', () => {
    render(
      <div className='h-[600px]'>
        <MessageThreadLayout
          header={<div>Header</div>}
          body={<div>Thread body</div>}
          composer={<div>Composer</div>}
        />
      </div>
    );

    expect(screen.getByTestId('message-thread-layout')).toHaveClass(
      'h-full',
      'min-h-0',
      'overflow-hidden'
    );
    expect(screen.getByTestId('message-thread-header')).toHaveClass('shrink-0');
    expect(screen.getByTestId('message-thread-scroll-area')).toHaveClass(
      'min-h-0',
      'flex-1'
    );
    expect(screen.getByTestId('message-thread-composer')).toHaveClass('shrink-0');
  });
});
