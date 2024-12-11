'use client';

export default function BullBoard() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Queue Monitor</h1>
      <iframe 
        src="http://localhost:3001/ui"
        className="w-full h-[calc(100vh-200px)] border-2 border-gray-200 rounded-lg"
      />
    </div>
  );
}
