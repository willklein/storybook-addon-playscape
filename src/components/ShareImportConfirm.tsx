import React from 'react';
import { Button, Modal } from 'storybook/internal/components';
import { styled } from 'storybook/theming';

export interface ShareImportConfirmProps {
  name: string;
  source: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const Body = styled.div({
  padding: '20px 24px',
  maxWidth: 640,
});

const Title = styled.h2(({ theme }) => ({
  margin: '0 0 12px',
  fontSize: theme.typography.size.m1,
  fontWeight: theme.typography.weight.bold,
  color: theme.color.defaultText,
}));

const Warning = styled.p(({ theme }) => ({
  margin: '0 0 16px',
  fontSize: theme.typography.size.s2,
  lineHeight: 1.5,
  color: theme.color.defaultText,
}));

const Emphasis = styled.strong(({ theme }) => ({
  color: theme.color.negative,
}));

const SourceLabel = styled.div(({ theme }) => ({
  fontSize: theme.typography.size.s1,
  fontWeight: theme.typography.weight.bold,
  color: theme.color.mediumdark,
  marginBottom: 6,
}));

const SourceBlock = styled.pre(({ theme }) => ({
  margin: '0 0 20px',
  padding: 12,
  maxHeight: 260,
  overflow: 'auto',
  background: theme.background.content,
  border: `1px solid ${theme.appBorderColor}`,
  borderRadius: 4,
  fontFamily: theme.typography.fonts.mono,
  fontSize: 12,
  lineHeight: 1.6,
  color: theme.color.defaultText,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}));

const Actions = styled.div({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
});

/**
 * Gate for anything arriving via a Playscape share link (the `loadPlayscape` URL param).
 * The source in that link came from whoever generated the URL, not from this project's own
 * story files, so it's shown here — unencoded, exactly as it will run — before it's ever
 * turned into a fork and evaluated against a real component.
 */
export const ShareImportConfirm: React.FC<ShareImportConfirmProps> = ({ name, source, onConfirm, onCancel }) => (
  <Modal
    open
    ariaLabel="Review shared Playscape code before running it"
    dismissOnClickOutside={false}
    onOpenChange={(isOpen) => {
      if (!isOpen) onCancel();
    }}
  >
    <Body>
      <Title>Review before loading &ldquo;{name}&rdquo;</Title>
      <Warning>
        This link was made with Playscape&rsquo;s Share button and carries code someone else wrote. If you continue,
        that code runs immediately inside this page with the same access as any other script here —{' '}
        <Emphasis>including reading cookies and other data on this site</Emphasis>. Only continue if you trust whoever
        sent you this link.
      </Warning>
      <SourceLabel>Code that will run, exactly as written:</SourceLabel>
      <SourceBlock>{source}</SourceBlock>
      <Actions>
        <Button onClick={onCancel} ariaLabel={false}>
          Cancel
        </Button>
        <Button onClick={onConfirm} ariaLabel={false}>
          Load and run this code
        </Button>
      </Actions>
    </Body>
  </Modal>
);
