import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Queue Monitor - Bull Board',
  description: 'Monitor and manage queue jobs',
};

export default function BullBoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
