import InspirationGeneratorClient from '@/components/inspiration-generator-client';

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-var(--header-height,4rem))]"> {/* Adjust header height if necessary */}
      <InspirationGeneratorClient />
    </div>
  );
}
