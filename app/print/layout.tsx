export const dynamic = "force-dynamic";

export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-white print:bg-white">
      <div className="mx-auto max-w-3xl px-4 pb-16 print:max-w-none print:px-0 print:pb-0">
        {children}
      </div>
    </div>
  );
}
