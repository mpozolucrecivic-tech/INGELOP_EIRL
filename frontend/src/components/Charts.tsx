import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CATEGORIA_GASTO, COLORES_CATEGORIA, formatMes, formatSoles, formatSolesCorto } from '@/lib/format';
import type { CategoriaGasto } from '@/types/api';

const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px rgb(15 23 42 / 0.08)',
  fontSize: 13,
};

/** Barras de gasto mensual */
export function GastoMensualChart({ data }: { data: { mes: string; monto: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="mes" tickFormatter={formatMes} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={(v: number) => formatSolesCorto(v)} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={72} />
        <Tooltip
          cursor={{ fill: '#f1f5f9' }}
          contentStyle={tooltipStyle}
          labelFormatter={(l) => formatMes(String(l))}
          formatter={(v) => [formatSoles(Number(v)), 'Gasto']}
        />
        <Bar dataKey="monto" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Dona de gasto por categoría con leyenda propia */
export function GastoCategoriaChart({ data }: { data: { categoria: CategoriaGasto; monto: number; porcentaje: number }[] }) {
  const conDatos = data.filter((d) => d.monto > 0);
  if (!conDatos.length) {
    return <p className="py-16 text-center text-sm text-slate-500">Aún no hay gastos registrados.</p>;
  }
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={conDatos} dataKey="monto" nameKey="categoria" innerRadius="60%" outerRadius="95%" paddingAngle={2} stroke="none">
              {conDatos.map((d) => (
                <Cell key={d.categoria} fill={COLORES_CATEGORIA[d.categoria]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v, n) => [formatSoles(Number(v)), CATEGORIA_GASTO[n as CategoriaGasto]]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full space-y-2 text-sm">
        {data.map((d) => (
          <li key={d.categoria} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: COLORES_CATEGORIA[d.categoria] }} />
            <span className="min-w-0 flex-1 truncate text-slate-600">{CATEGORIA_GASTO[d.categoria]}</span>
            <span className="font-medium tabular-nums text-slate-900">{formatSoles(d.monto)}</span>
            <span className="w-12 text-right text-xs tabular-nums text-slate-500">{d.porcentaje}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
