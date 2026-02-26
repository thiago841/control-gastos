import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';

// Una paleta de colores moderna y variada para las porciones
const COLORES = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function GraficoGastos({ movimientos }) {
  // 1. Filtramos solo los Egresos y solo los que son en Pesos (ARS)
  const gastos = movimientos.filter(m => m.tipo === 'egreso' && (!m.moneda || m.moneda === 'ARS'));

  // Si no hay gastos este mes, no mostramos el gráfico
  if (gastos.length === 0) return null;

  // 2. Agrupamos y sumamos por categoría matemática pura
  const datosAgrupados = gastos.reduce((acc, mov) => {
    const categoria = mov.categorias?.nombre || 'Otros';
    if (!acc[categoria]) {
      acc[categoria] = 0;
    }
    acc[categoria] += Number(mov.monto);
    return acc;
  }, {});

  // 3. Convertimos ese objeto en el array que necesita Recharts y lo ordenamos de mayor a menor
  const datos = Object.keys(datosAgrupados)
    .map(key => ({
      name: key,
      value: datosAgrupados[key]
    }))
    .sort((a, b) => b.value - a.value);

  const formatearDinero = (monto) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(monto);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6 animate-in fade-in duration-500">
      <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
        <PieChartIcon className="text-indigo-600" size={20} />
        ¿En qué se fue la plata este mes?
      </h3>
      
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={datos}
              cx="50%"
              cy="50%"
              innerRadius={70} // Esto lo hace "Donut" en vez de torta sólida
              outerRadius={100}
              paddingAngle={3} // Espacio entre porciones
              dataKey="value"
            >
              {datos.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORES[index % COLORES.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value) => formatearDinero(value)}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend 
              layout="horizontal" 
              verticalAlign="bottom" 
              align="center"
              wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}