import { BranchIcon, PlusIcon, TrashIcon } from '@storybook/icons';
import React from 'react';
import { Button, IconButton } from 'storybook/internal/components';
import { styled } from 'storybook/theming';

import { DEFAULT_FORK_NAME } from '../constants';
import type { PlayscapeFork } from '../types';

interface ForkListProps {
  forks: PlayscapeFork[];
  onOpenDefault: () => void;
  onOpenFork: (forkId: string) => void;
  onNewFork: () => void;
  onDelete: (forkId: string) => void;
}

const Header = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 20px',
  borderBottom: `1px solid ${theme.appBorderColor}`,
}));

const Title = styled.div(({ theme }) => ({
  fontSize: theme.typography.size.s2,
  fontWeight: theme.typography.weight.bold,
  color: theme.color.defaultText,
}));

const Row = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  padding: '12px 20px',
  borderBottom: `1px solid ${theme.appBorderColor}`,
  cursor: 'pointer',
  '&:hover': {
    background: theme.background.hoverable,
  },
}));

const Name = styled.div(({ theme }) => ({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: theme.typography.size.s2,
  color: theme.color.defaultText,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}));

const Meta = styled.div(({ theme }) => ({
  flex: '0 0 200px',
  fontSize: theme.typography.size.s1,
  color: theme.color.mediumdark,
}));

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export const ForkList: React.FC<ForkListProps> = ({ forks, onOpenDefault, onOpenFork, onNewFork, onDelete }) => {
  const hasDefault = forks.some((fork) => fork.isDefault);

  return (
    <div>
      <Header>
        <Title>Playscape forks</Title>
        <Button disabled={!hasDefault} onClick={onNewFork}>
          <PlusIcon /> New fork
        </Button>
      </Header>

      {!hasDefault ? (
        <Row onClick={onOpenDefault}>
          <Name>
            <BranchIcon /> {DEFAULT_FORK_NAME}
          </Name>
          <Meta>Click to start editing</Meta>
        </Row>
      ) : null}

      {forks.map((fork) => (
        <Row key={fork.id} onClick={() => onOpenFork(fork.id)}>
          <Name>
            <BranchIcon /> {fork.name}
          </Name>
          <Meta>Created {formatDate(fork.createdAt)}</Meta>
          <Meta>Edited {formatDate(fork.updatedAt)}</Meta>
          <IconButton
            title="Delete fork"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(fork.id);
            }}
          >
            <TrashIcon />
          </IconButton>
        </Row>
      ))}
    </div>
  );
};
