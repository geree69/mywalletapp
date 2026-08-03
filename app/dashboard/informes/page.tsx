'use client';

import { useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const fmt = (n: number) => {
  const v = Number(n) || 0;
  return v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
};

const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default function InformesPage() {
  const { state } = useAppContext();
  const transactions = state.transactions || [];

  // --- LÓGICA DE AÑOS DISPONIBLES PARA LA GRÁFICA ---
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    transactions.forEach((t: any) => {
      if (t.date) years.add(t.date.slice(0, 4));
    });
    const currentYear = new Date().getFullYear().toString();
    years.add(currentYear); 
    return Array.from(years).sort().reverse();
  }, [transactions]);

  const [selectedYearForChart, setSelectedYearForChart] = useState(new Date().getFullYear().toString());
  const activeChartYear = availableYears.includes(selectedYearForChart) ? selectedYearForChart : (availableYears[0] || new Date().getFullYear().toString());

  // --- LÓGICA PARA LA GRÁFICA ---
  const chartData = useMemo(() => {
    const currentTotalBalance = (state.accounts || []).reduce((acc: number, a: any) => acc + Number(a.balance || 0), 0) || Number(state.balance || 0);

    const totalNetFlowAllTime = transactions.reduce((acc: number, t: any) => {
      if (t.type === 'income') return acc + Number(t.amount || 0);
      if (t.type === 'expense') return acc - Math.abs(Number(t.amount || 0));
      return acc;
    }, 0);

    const baseWealth = currentTotalBalance - totalNetFlowAllTime;

    const today = new Date();
    const currentYearStr = today.getFullYear().toString();
    const currentMonthNum = today.getMonth() + 1;

    let firstTxDate = "9999-99";
    transactions.forEach((t: any) => {
      if (t.date && t.date < firstTxDate) {
        firstTxDate = t.date;
      }
    });

    let minMonth = 1;
    let maxMonth = 12;

    if (activeChartYear === currentYearStr) {
      maxMonth = currentMonthNum; 
    }

    if (firstTxDate !== "9999-99") {
      const firstTxYear = firstTxDate.slice(0, 4);
      const firstTxMonth = parseInt(firstTxDate.slice(5, 7), 10);
      
      if (activeChartYear === firstTxYear) {
        minMonth = firstTxMonth;
      }
    } else {
      minMonth = currentMonthNum;
      maxMonth = currentMonthNum;
    }

    const data = [];
    for (let i = minMonth - 1; i < maxMonth; i++) {
      const monthNum = i + 1;
      const monthKey = `${activeChartYear}-${String(monthNum).padStart(2, '0')}`;
      const name = MONTH_NAMES[i];
      
      let Ingresos = 0;
      let Gastos = 0;
      let netFlowUpToMonth = 0;

      transactions.forEach((t: any) => {
        if (!t.date) return;
        const tMonthKey = t.date.slice(0, 7);
        const amount = Number(t.amount || 0);
        
        if (tMonthKey <= monthKey) {
          if (t.type === 'income') netFlowUpToMonth += amount;
          if (t.type === 'expense') netFlowUpToMonth -= Math.abs(amount);
        }
        
        if (tMonthKey === monthKey) {
          if (t.type === 'income') Ingresos += amount;
          if (t.type === 'expense') Gastos += Math.abs(amount);
        }
      });

      const Patrimonio = baseWealth + netFlowUpToMonth;
      data.push({ name, sortKey: monthKey, Patrimonio, Ingresos, Gastos });
    }

    return data;
  }, [transactions, activeChartYear, state.accounts, state.balance]);


  // --- LÓGICA UNIFICADA PARA DESCARGA DE PDF ---
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach((t: any) => {
      if (t.date) months.add(t.date.slice(0, 7));
    });
    return Array.from(months).sort().reverse();
  }, [transactions]);

  const [reportType, setReportType] = useState<'mensual' | 'anual' | 'rango'>('mensual');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');

  const handleGeneratePDF = () => {
    let filteredTransactions: any[] = [];
    let title = '';
    let filename = '';

    if (reportType === 'mensual') {
      if (!selectedMonth) return;
      filteredTransactions = transactions.filter((t: any) => t.date && t.date.startsWith(selectedMonth));
      const [y, m] = selectedMonth.split('-');
      title = `Extracto Mensual - ${MONTH_NAMES[Number(m)-1]} ${y}`;
      filename = `Extracto_Mensual_${selectedMonth}.pdf`;
    } 
    else if (reportType === 'anual') {
      if (!selectedYear) return;
      filteredTransactions = transactions.filter((t: any) => t.date && t.date.startsWith(selectedYear));
      title = `Extracto Anual - ${selectedYear}`;
      filename = `Extracto_Anual_${selectedYear}.pdf`;
    } 
    else if (reportType === 'rango') {
      if (!rangeStart || !rangeEnd) return;
      const start = rangeStart < rangeEnd ? rangeStart : rangeEnd;
      const end = rangeStart > rangeEnd ? rangeStart : rangeEnd;
      
      filteredTransactions = transactions.filter((t: any) => {
        if (!t.date) return false;
        const tMonthKey = t.date.slice(0, 7); // YYYY-MM
        return tMonthKey >= start && tMonthKey <= end;
      });
      title = `Extracto Personalizado (${start} a ${end})`;
      filename = `Extracto_Rango_${start}_al_${end}.pdf`;
    }

    filteredTransactions.sort((a, b) => a.date.localeCompare(b.date));

    let totalIncome = 0;
    let totalExpense = 0;
    filteredTransactions.forEach((t: any) => {
      if (t.type === 'income') totalIncome += Number(t.amount);
      if (t.type === 'expense') totalExpense += Math.abs(Number(t.amount));
    });

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Total Ingresos: ${fmt(totalIncome)}`, 14, 32);
    doc.text(`Total Gastos: ${fmt(totalExpense)}`, 14, 38);
    doc.text(`Balance del periodo: ${fmt(totalIncome - totalExpense)}`, 14, 44);

    const tableBody = filteredTransactions.map((t: any) => [
      t.date, t.title, t.category, t.type === 'income' ? 'Ingreso' : 'Gasto',
      { content: `${t.type === 'expense' ? '-' : '+'}${fmt(t.amount)}`, styles: { textColor: t.type === 'expense' ? [235, 110, 93] : [42, 157, 143] } }
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['Fecha', 'Concepto', 'Categoría', 'Tipo', 'Importe']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [42, 42, 56] },
      styles: { fontSize: 9 },
    });
    doc.save(filename);
  };

  const isDownloadDisabled = 
    (reportType === 'mensual' && !selectedMonth) ||
    (reportType === 'anual' && !selectedYear) ||
    (reportType === 'rango' && (!rangeStart || !rangeEnd));

  return (
    <div className="flex flex-col space-y-6 pb-10">
      
      <div>
        <h2 className="font-['Playfair_Display'] text-[20px] font-semibold m-0 mb-1 text-[var(--ink)] tracking-wide">
          Informes y Gráficas
        </h2>
        <p className="text-[12px] text-[var(--text-soft)] m-0 leading-relaxed">
          Analiza tu evolución financiera y descarga tus extractos.
        </p>
      </div>

      {/* SECCIÓN DE GRÁFICA */}
      <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-4 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-[14px] font-semibold text-[var(--ink)] m-0 uppercase tracking-wider">
            Resumen del Año
          </h3>
          <select
            value={activeChartYear}
            onChange={(e) => setSelectedYearForChart(e.target.value)}
            className="p-1.5 pl-3 pr-8 rounded-[6px] border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] text-[12px] font-semibold outline-none cursor-pointer hover:border-[var(--gold)] transition-colors"
          >
            {availableYears.map(year => (
              <option key={year} value={year} className="bg-[#121218] text-white">{year}</option>
            ))}
          </select>
        </div>
        
        <div className="w-full h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A2A38" opacity={0.5} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}€`} />
              
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                contentStyle={{ backgroundColor: '#121218', border: '1px solid #2A2A38', borderRadius: '8px', fontSize: '12px', color: '#FFF' }}
                itemStyle={{ fontWeight: 500 }}
                formatter={(value: number) => fmt(value)}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }} iconType="circle" />
              <Bar dataKey="Patrimonio" name="Patrimonio" fill="#FFFFFF" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Gastos" name="Gastos" fill="#EB6E5D" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Ingresos" name="Ganancias" fill="#E9C46A" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SECCIÓN DE DESCARGAS (DISEÑO VERTICAL APILADO) */}
      <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-5 shadow-sm space-y-5">
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--ink)] m-0 mb-1">Generar Extracto en PDF</h3>
          <p className="text-[12px] text-[var(--text-soft)] m-0">Selecciona el periodo que quieres exportar y descarga el desglose de todos tus movimientos.</p>
        </div>

        {transactions.length === 0 ? (
          <p className="text-[12px] text-[var(--text-soft)] bg-[#121218] p-3 rounded-[8px]">No tienes movimientos para generar informes.</p>
        ) : (
          <div className="space-y-4">
            
            {/* TIPO DE INFORME */}
            <div className="w-full md:w-1/2">
              <label className="block text-[10px] text-[var(--text-soft)] mb-1.5 uppercase font-medium">Tipo de informe</label>
              <select 
                value={reportType}
                onChange={(e: any) => setReportType(e.target.value)}
                className="w-full h-[42px] pl-3 pr-8 rounded-[8px] border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] text-[13px] outline-none focus:border-[var(--gold)]"
              >
                <option value="mensual" className="bg-[#121218]">Mes concreto</option>
                <option value="anual" className="bg-[#121218]">Año completo</option>
                <option value="rango" className="bg-[#121218]">Rango de meses (Personalizado)</option>
              </select>
            </div>

            {/* OPCIONES DINÁMICAS (Todas apiladas) */}
            
            {reportType === 'mensual' && (
              <div className="w-full md:w-1/2">
                <label className="block text-[10px] text-[var(--text-soft)] mb-1.5 uppercase font-medium">Selecciona el mes</label>
                <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full h-[42px] pl-3 pr-8 rounded-[8px] border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] text-[13px] outline-none focus:border-[var(--gold)]"
                >
                  <option value="" disabled className="bg-[#121218] text-gray-500">Selecciona un mes...</option>
                  {availableMonths.map(monthKey => {
                    const [y, m] = monthKey.split('-');
                    return (
                      <option key={monthKey} value={monthKey} className="bg-[#121218]">
                        {MONTH_NAMES[Number(m) - 1]} {y}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {reportType === 'anual' && (
              <div className="w-full md:w-1/2">
                <label className="block text-[10px] text-[var(--text-soft)] mb-1.5 uppercase font-medium">Selecciona el año</label>
                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full h-[42px] pl-3 pr-8 rounded-[8px] border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] text-[13px] outline-none focus:border-[var(--gold)]"
                >
                  <option value="" disabled className="bg-[#121218] text-gray-500">Selecciona un año...</option>
                  {availableYears.map(year => (
                    <option key={year} value={year} className="bg-[#121218]">{year}</option>
                  ))}
                </select>
              </div>
            )}

            {reportType === 'rango' && (
              <div className="w-full md:w-1/2 flex flex-col gap-4">
                <div>
                  <label className="block text-[10px] text-[var(--text-soft)] mb-1.5 uppercase font-medium">Desde</label>
                  <input 
                    type="month" 
                    value={rangeStart}
                    onChange={(e) => setRangeStart(e.target.value)}
                    className="w-full h-[42px] px-3 rounded-[8px] border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] text-[13px] outline-none focus:border-[var(--gold)] [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[var(--text-soft)] mb-1.5 uppercase font-medium">Hasta</label>
                  <input 
                    type="month" 
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(e.target.value)}
                    className="w-full h-[42px] px-3 rounded-[8px] border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] text-[13px] outline-none focus:border-[var(--gold)] [color-scheme:dark]"
                  />
                </div>
              </div>
            )}

            {/* BOTÓN DESCARGAR */}
            <div className="pt-2">
              <button 
                onClick={handleGeneratePDF}
                disabled={isDownloadDisabled}
                className={`h-[42px] px-6 w-full md:w-1/2 rounded-[8px] font-semibold text-[13px] whitespace-nowrap flex items-center justify-center transition-all ${
                  isDownloadDisabled 
                    ? 'bg-[var(--paper-line)] text-gray-500 cursor-not-allowed opacity-50' 
                    : 'bg-[var(--gold)] text-[#0D0D12] cursor-pointer hover:opacity-90'
                }`}
              >
                Descargar PDF
              </button>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}