export function PlaceholderPage({
  title,
  block,
}: {
  title: string;
  block: string;
}) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <div className="mb-2 text-4xl">🚧</div>
        <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Módulo em construção — chega no {block}.
        </p>
      </div>
    </div>
  );
}
