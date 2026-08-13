import React, { useEffect, useState } from 'react';
import heroImage from './assets/hero.png';
import creozenLogo from './assets/CREOZEN.png';
import bitLogo from './assets/cropped-bit_logo.png';
import { 
  Users, 
  Car, 
  Bike, 
  Bus, 
  Truck, 
  Activity,
  Loader2,
  ArrowBigDown,
  ArrowBigUp,
  Calendar,
  Flame,
  Clock
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

function MetricCard({ title, icon, value, colorClass, subtitle }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between relative z-10">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-1">{title}</p>
          <h3 className="text-4xl font-extrabold text-gray-900">{value !== undefined ? value : '--'}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`rounded-xl p-4 ${colorClass}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function formatDateLabel(dateStr) {
  if (!dateStr) return '';
  if (dateStr === 'all') return 'All Time (Cumulative)';
  const dateObj = new Date(dateStr + 'T00:00:00+05:30');
  const options = { timeZone: 'Asia/Kolkata', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
  const formatted = dateObj.toLocaleDateString('en-US', options);
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return dateStr === todayStr ? `${formatted} (Today)` : formatted;
}

function formatChartTime(timeStr) {
  if (!timeStr) return '';
  if (timeStr.includes(' ')) {
    const [d, t] = timeStr.split(' ');
    const dateObj = new Date(`${d}T${t}:00+05:30`);
    return dateObj.toLocaleDateString('en-US', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }
  return timeStr;
}

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  const fetchData = (dateToFetch) => {
    if (!data) setLoading(true);
    const url = dateToFetch ? `/api/dashboard?date=${dateToFetch}` : '/api/dashboard';
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(json => {
        setData(json);
        if (!selectedDate && !dateToFetch) {
          setSelectedDate(json.date);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch dashboard data:", err);
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchData(selectedDate);
    const interval = setInterval(() => fetchData(selectedDate), 5000);
    return () => clearInterval(interval);
  }, [selectedDate]);

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
  };

  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
          <p className="text-lg font-medium text-gray-500">Loading live database...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-900 p-4">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
          <Activity className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Failed to load data</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  // Parse Hourly Data for Stream 1 (Vehicles)
  const vehicleChartData = [];
  if (data?.stream_1_hourly) {
    Object.keys(data.stream_1_hourly).forEach(time => {
       const streams = data.stream_1_hourly[time].stream_1;
       if (streams) {
         vehicleChartData.push({
           time,
           "Cars In": streams.car?.in_count || 0,
           "Cars Out": streams.car?.out_count || 0,
           "Bikes In": streams.motorcycle?.in_count || 0,
           "Bikes Out": streams.motorcycle?.out_count || 0,
           "Buses In": streams.bus?.in_count || 0,
           "Buses Out": streams.bus?.out_count || 0,
           "Trucks In": streams.truck?.in_count || 0,
           "Trucks Out": streams.truck?.out_count || 0,
         });
       }
    });
    vehicleChartData.sort((a, b) => a.time.localeCompare(b.time));
  }

  // Parse Hourly Data for Stream 0 & Stream 2 (People Flow)
  const peopleChartData = [];
  const hoursSet = new Set([
    ...Object.keys(data?.stream_0_hourly || {}),
    ...Object.keys(data?.stream_2_hourly || {})
  ]);
  Array.from(hoursSet).sort().forEach(time => {
    const s0In = data?.stream_0_hourly?.[time]?.stream_0?.in_count || 0;
    const s2Out = data?.stream_2_hourly?.[time]?.stream_2?.out_count || data?.stream_0_hourly?.[time]?.stream_0?.out_count || 0;
    peopleChartData.push({
      time,
      "People In": s0In,
      "People Out": s2Out
    });
  });

  const stream1 = data?.stream_1 || {};
  const availableDates = data?.availableDates || [data?.date];

  const totalVehiclesIn = (stream1?.car?.in_count || 0) + (stream1?.motorcycle?.in_count || 0) + (stream1?.bus?.in_count || 0) + (stream1?.truck?.in_count || 0);
  const totalVehiclesOut = (stream1?.car?.out_count || 0) + (stream1?.motorcycle?.out_count || 0) + (stream1?.bus?.out_count || 0) + (stream1?.truck?.out_count || 0);

  const formattedDate = currentDateTime.toLocaleDateString('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const formattedTime = currentDateTime.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 selection:bg-indigo-500/30 font-sans">
      
      {/* Banner Image (Full Width Uncropped) */}
      <div className="w-full mb-6">
        <img src={heroImage} alt="Dashboard Banner" className="w-full h-auto block" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
        {/* Top Header & Date Filter Bar */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-white p-6 border border-gray-200 shadow-sm">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Live Analytics Overview</h1>
            <div className="mt-2 inline-flex items-center rounded-full bg-gray-50 px-4 py-1.5 border border-gray-200 gap-2">
              <span className="text-xs font-semibold text-gray-600">{formattedDate}</span>
              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
              <span className="text-xs font-bold text-indigo-600">{formattedTime}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
             <p className="text-xs text-gray-500 flex items-center justify-end gap-1">
               <Clock className="w-3.5 h-3.5 text-indigo-500" /> Filter metrics by date
             </p>
             <div className="flex items-center gap-2 rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 shadow-inner hover:border-indigo-400 transition-colors">
               <Calendar className="w-5 h-5 text-indigo-600" />
               <label htmlFor="date-select" className="sr-only">Select Date</label>
               <select
                 id="date-select"
                 value={selectedDate || data?.date || ''}
                 onChange={handleDateChange}
                 className="bg-transparent font-medium text-gray-800 text-sm focus:outline-none cursor-pointer"
               >
                 {availableDates.map(date => (
                   <option key={date} value={date}>
                     {formatDateLabel(date)}
                   </option>
                 ))}
               </select>
             </div>
          </div>
        </div>

        {/* Top Level Metrics (People In & People Out) */}
        <div className="mb-10 grid gap-6 md:grid-cols-2">
          <MetricCard
            title="People In"
            value={data?.stream_0?.in_count}
            subtitle={`Selected date: ${data?.date}`}
            icon={<ArrowBigDown className="h-8 w-8 text-indigo-600" />}
            colorClass="bg-indigo-50"
          />
          <MetricCard
            title="People Out"
            value={data?.stream_2?.out_count !== undefined ? data.stream_2.out_count : 0}
            subtitle={`Selected date: ${data?.date}`}
            icon={<ArrowBigUp className="h-8 w-8 text-emerald-600" />}
            colorClass="bg-emerald-50"
          />
        </div>

        {/* Vehicle Counting Summary */}
        <div className="mb-12 rounded-[2rem] border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="mb-8 flex items-center gap-4">
            <div className="rounded-xl bg-blue-50 p-3">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Vehicle Analytics</h2>
              <p className="text-xs sm:text-sm text-gray-500">Summary counts for {formatDateLabel(data?.date)}</p>
            </div>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {/* Total Vehicles */}
            <div className="rounded-3xl bg-indigo-50 p-6 border border-indigo-100 shadow-sm relative overflow-hidden">
              <div className="mb-6 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white shadow-xs"><Activity className="h-5 w-5 text-indigo-600" /></div>
                  <h4 className="font-semibold text-indigo-900">All Vehicles</h4>
                </div>
              </div>
              <div className="flex justify-between border-t border-indigo-200/60 pt-5 relative z-10">
                <div>
                  <p className="text-xs font-bold text-indigo-500 mb-1 tracking-wider">IN</p>
                  <p className="text-3xl font-bold text-indigo-700">{totalVehiclesIn}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-indigo-500 mb-1 tracking-wider">OUT</p>
                  <p className="text-3xl font-bold text-indigo-700">{totalVehiclesOut}</p>
                </div>
              </div>
            </div>

            {/* Cars */}
            <div className="rounded-3xl bg-gray-50 p-6 border border-gray-100 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white shadow-xs"><Car className="h-5 w-5 text-gray-600" /></div>
                  <h4 className="font-semibold text-gray-800">Cars</h4>
                </div>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-5">
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-1 tracking-wider">IN</p>
                  <p className="text-3xl font-bold text-emerald-600">{stream1?.car?.in_count || 0}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-500 mb-1 tracking-wider">OUT</p>
                  <p className="text-3xl font-bold text-rose-600">{stream1?.car?.out_count || 0}</p>
                </div>
              </div>
            </div>

            {/* Motorcycles */}
            <div className="rounded-3xl bg-gray-50 p-6 border border-gray-100 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white shadow-xs"><Bike className="h-5 w-5 text-gray-600" /></div>
                  <h4 className="font-semibold text-gray-800">Motorcycles</h4>
                </div>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-5">
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-1 tracking-wider">IN</p>
                  <p className="text-3xl font-bold text-emerald-600">{stream1?.motorcycle?.in_count || 0}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-500 mb-1 tracking-wider">OUT</p>
                  <p className="text-3xl font-bold text-rose-600">{stream1?.motorcycle?.out_count || 0}</p>
                </div>
              </div>
            </div>

            {/* Buses */}
            <div className="rounded-3xl bg-gray-50 p-6 border border-gray-100 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white shadow-xs"><Bus className="h-5 w-5 text-gray-600" /></div>
                  <h4 className="font-semibold text-gray-800">Buses</h4>
                </div>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-5">
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-1 tracking-wider">IN</p>
                  <p className="text-3xl font-bold text-emerald-600">{stream1?.bus?.in_count || 0}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-500 mb-1 tracking-wider">OUT</p>
                  <p className="text-3xl font-bold text-rose-600">{stream1?.bus?.out_count || 0}</p>
                </div>
              </div>
            </div>

            {/* Trucks */}
            <div className="rounded-3xl bg-gray-50 p-6 border border-gray-100 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white shadow-xs"><Truck className="h-5 w-5 text-gray-600" /></div>
                  <h4 className="font-semibold text-gray-800">Trucks</h4>
                </div>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-5">
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-1 tracking-wider">IN</p>
                  <p className="text-3xl font-bold text-emerald-600">{stream1?.truck?.in_count || 0}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-500 mb-1 tracking-wider">OUT</p>
                  <p className="text-3xl font-bold text-rose-600">{stream1?.truck?.out_count || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* People Flow & Peak Hour Chart */}
        <div className="mb-12 rounded-[2rem] border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-indigo-50 p-3">
                <Users className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">People Flow Analytics</h2>
                <p className="text-xs sm:text-sm text-gray-500">Hourly entries & exits breakdown</p>
              </div>
            </div>

            {data?.peak_people && (
              <div className="flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 px-4 py-2.5 border border-amber-200/60 text-amber-900">
                <Flame className="h-5 w-5 text-amber-600 animate-pulse" />
                <span className="text-xs sm:text-sm font-semibold">
                  Peak In Hour: <span className="font-extrabold text-amber-700">{data.peak_people.time}</span> ({data.peak_people.in_count} People)
                </span>
              </div>
            )}
          </div>

          {peopleChartData.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <div className="h-[320px] sm:h-[400px] min-w-[450px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={peopleChartData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="time" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} tickMargin={8} tickFormatter={formatChartTime} />
                    <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <RechartsTooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '1rem', color: '#0f172a', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                      labelFormatter={formatChartTime}
                    />
                    <Legend wrapperStyle={{ paddingTop: '15px' }} />
                    <Bar dataKey="People In" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="People Out" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <p className="text-center py-8 text-sm text-gray-500 italic">No hourly people flow data recorded for this date.</p>
          )}
        </div>

        {/* Hourly Vehicle Chart */}
        {vehicleChartData.length > 0 && (
          <div className="rounded-[2rem] border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
            <h3 className="mb-6 text-2xl font-bold tracking-tight text-gray-900">Hourly Vehicle Traffic Breakdown</h3>
            <div className="w-full overflow-x-auto">
              <div className="h-[350px] sm:h-[450px] min-w-[500px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={vehicleChartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="time" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 11 }} tickMargin={10} tickFormatter={formatChartTime} />
                    <YAxis stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <RechartsTooltip 
                      cursor={{ fill: '#f3f4f6' }}
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb', borderRadius: '1rem', color: '#111827', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                      itemStyle={{ color: '#374151', fontWeight: 500 }}
                      labelFormatter={formatChartTime}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="Cars In" stackId="a" fill="#34d399" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="Cars Out" stackId="a" fill="#fb7185" radius={[4, 4, 0, 0]} />
                    
                    <Bar dataKey="Bikes In" stackId="b" fill="#10b981" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="Bikes Out" stackId="b" fill="#f43f5e" radius={[4, 4, 0, 0]} />

                    <Bar dataKey="Buses In" stackId="c" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="Buses Out" stackId="c" fill="#f59e0b" radius={[4, 4, 0, 0]} />

                    <Bar dataKey="Trucks In" stackId="d" fill="#8b5cf6" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="Trucks Out" stackId="d" fill="#ec4899" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Footer section */}
        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col items-center text-center">
          <div className="flex items-center justify-center gap-8 mb-6">
            <img src={creozenLogo} alt="Creozen Logo" className="h-10 object-contain" />
            <span className="text-gray-300 font-bold text-xl">X</span>
            <img src={bitLogo} alt="Bannari Amman Institute of Technology Logo" className="h-16 object-contain" />
          </div>
          <p className="text-sm text-gray-500 font-medium max-w-lg">
            Counting Organized and Managed by Creozen Ltd, a student startup incubated in Bannari Amman Institute of Technology
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;

