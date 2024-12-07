import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Queue Monitor - Bull Board',
  description: 'Monitor and manage queue jobs',
};

export default function BullBoard() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Queue Monitor</h1>
      <iframe 
        src="/api/bull-board" 
        className="w-full h-[calc(100vh-200px)] border-2 border-gray-200 rounded-lg"
      />
    </div>
  );
}
