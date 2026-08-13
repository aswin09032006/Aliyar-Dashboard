import React, { useEffect, useState, useRef } from 'react';
import heroImage from './assets/hero.png';
import { 
  Users, 
  Car, 
  Bike, 
  Bus, 
  Truck, 
  ArrowUpRight,
  Activity,
  Loader2,
  ArrowBigDown,
  ArrowBigUp
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

function MetricCard({ title, icon, value, colorClass }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 ">
      <div className="flex items-center justify-between relative z-10">
        <div>
          <p className="text-xl font-medium text-gray-500 mb-1">{title}</p>
          <h3 className="text-4xl font-bold text-gray-900">{value !== undefined ? value : '--'}</h3>
        </div>
        <div className={`rounded-xl p-4 ${colorClass}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  const lastCarInRef = useRef(parseInt(localStorage.getItem('lastCarIn') || '-1', 10));
  const lastCarOutRef = useRef(parseInt(localStorage.getItem('lastCarOut') || '-1', 10));

  useEffect(() => {
    if (data?.stream_1?.car) {
      const currentCarIn = data.stream_1.car.in_count || 0;
      const currentCarOut = data.stream_1.car.out_count || 0;

      let addedIn = 0;
      let addedOut = 0;

      if (lastCarInRef.current !== -1) {
        if (currentCarIn > lastCarInRef.current) {
          const diff = currentCarIn - lastCarInRef.current;
          for(let i = 0; i < diff; i++) {
             addedIn += Math.floor(Math.random() * 3) + 2; // Random 2, 3, or 4
          }
        }
      }
      lastCarInRef.current = currentCarIn;
      localStorage.setItem('lastCarIn', currentCarIn.toString());

      if (lastCarOutRef.current !== -1) {
        if (currentCarOut > lastCarOutRef.current) {
          const diff = currentCarOut - lastCarOutRef.current;
          for(let i = 0; i < diff; i++) {
             addedOut += Math.floor(Math.random() * 3) + 2; // Random 2, 3, or 4
          }
        }
      }
      lastCarOutRef.current = currentCarOut;
      localStorage.setItem('lastCarOut', currentCarOut.toString());

      if (addedIn > 0 || addedOut > 0) {
        // Date format: YYYY-MM-DD
        const date = new Date().toISOString().split('T')[0];
        fetch('/api/add-people', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, addedIn, addedOut })
        }).catch(console.error);
      }
    }
  }, [data]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchData = () => {
      fetch('/api/dashboard')
        .then(res => {
          if (!res.ok) throw new Error('Network response was not ok');
          return res.json();
        })
        .then(json => {
          setData(json);
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to fetch dashboard data:", err);
          setError(err.message);
          setLoading(false);
        });
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
          <p className="text-lg font-medium text-gray-500">Loading live database...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-900 p-4">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center ">
          <Activity className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Failed to load data</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  // Parse Hourly Data for Stream 1
  const hourlyChartData = [];
  if (data?.stream_1_hourly) {
    Object.keys(data.stream_1_hourly).forEach(time => {
       const streams = data.stream_1_hourly[time].stream_1;
       if (streams) {
         hourlyChartData.push({
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
    hourlyChartData.sort((a, b) => a.time.localeCompare(b.time));
  }

  const stream1 = data?.stream_1 || {};

  const formattedDate = currentDateTime.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const formattedTime = currentDateTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 selection:bg-indigo-500/30 font-sans">
      
      {/* Banner Image (Full Width) */}
      <div className="w-full mb-8">
        <img src={heroImage} alt="Dashboard Banner" className="w-full h-auto object-cover" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
        {/* Date Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Live Overview</h2>
          <div className="mt-4 sm:mt-0 inline-flex items-center rounded-full bg-white px-5 py-2 border border-gray-200 shadow-sm gap-3">
            <span className="text-sm font-semibold text-gray-600">{formattedDate}</span>
            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
            <span className="text-sm font-bold text-indigo-600">{formattedTime}</span>
          </div>
        </div>

        {/* Top Level Metrics (Stream 0 & Stream 2) */}
        <div className="mb-12 grid gap-6 md:grid-cols-2">
          <MetricCard
            title="People In"
            value={data?.stream_0?.in_count}
            icon={<ArrowBigDown className="h-8 w-8 text-indigo-600" />}
            colorClass="bg-indigo-50"
          />
          <MetricCard
            title="People Out"
            value={data?.stream_2?.out_count !== undefined ? data.stream_2.out_count : 0}
            icon={<ArrowBigUp className="h-8 w-8 text-emerald-600" />}
            colorClass="bg-emerald-50"
          />
        </div>

        {/* Stream 1 Breakdown (Vehicle Counting) */}
        <div className="mb-12 rounded-[2rem] border border-gray-200 bg-white p-8 ">
          <div className="mb-8 flex items-center gap-4">
            <div className="rounded-xl bg-blue-50 p-3">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Vehicle Analytics</h2>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Cars */}
            <div className="rounded-3xl bg-gray-50 p-6 border border-gray-100">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white "><Car className="h-5 w-5 text-gray-600" /></div>
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
            <div className="rounded-3xl bg-gray-50 p-6 border border-gray-100">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white "><Bike className="h-5 w-5 text-gray-600" /></div>
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
            <div className="rounded-3xl bg-gray-50 p-6 border border-gray-100">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white "><Bus className="h-5 w-5 text-gray-600" /></div>
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
            <div className="rounded-3xl bg-gray-50 p-6 border border-gray-100">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white "><Truck className="h-5 w-5 text-gray-600" /></div>
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

        {/* Hourly Chart */}
        {hourlyChartData.length > 0 && (
          <div className="rounded-[2rem] border border-gray-200 bg-white p-8 ">
            <h3 className="mb-8 text-2xl font-bold tracking-tight text-gray-900">Hourly Vehicle Traffic</h3>
            <div className="h-[450px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyChartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="time" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 12 }} tickMargin={10} />
                  <YAxis stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <RechartsTooltip 
                    cursor={{fill: '#f3f4f6'}}
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb', borderRadius: '1rem', color: '#111827', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    itemStyle={{ color: '#374151', fontWeight: 500 }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '30px' }} />
                  <Bar dataKey="Cars In" stackId="a" fill="#34d399" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="Cars Out" stackId="a" fill="#fb7185" radius={[4, 4, 0, 0]} />
                  
                  <Bar dataKey="Bikes In" stackId="b" fill="#10b981" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="Bikes Out" stackId="b" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
