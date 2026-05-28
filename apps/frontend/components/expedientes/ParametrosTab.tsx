'use client';

interface ParametrosTabProps {
  parametros: Record<string, unknown>;
}

export function ParametrosTab({ parametros }: ParametrosTabProps) {
  const entries = Object.entries(parametros);

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Parametros</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-500">Sin parametros definidos</p>
      ) : (
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Nombre</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entries.map(([nombre, valor]) => (
              <tr key={nombre}>
                <td className="px-4 py-2 font-medium text-gray-900">{nombre}</td>
                <td className="px-4 py-2 text-gray-600">{String(valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
