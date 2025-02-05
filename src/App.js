import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import './App.css'; // Ensure Tailwind is imported here if you configured it

function DataSummary({ data, users, type }) {
  const getData = () => {
    switch(type) {
      case 'calls':
        return data.dailyCallsData;
      case 'minutes':
        return data.dailyMinutesData;
      case 'hourly':
        return data.hourlyCallsData;
      default:
        return [];
    }
  };
  const tableData = getData();
  const timeKey = type === 'hourly' ? 'hour' : 'date';
  
  return (
    <div className="bg-white p-6 rounded-lg shadow overflow-x-auto border border-[#E3F2F1]">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-[#2EC4B6]">
            <th className="px-4 py-2 text-left text-white font-semibold border border-[#E3F2F1]">Name</th>
            {tableData.map(item => (
              <th key={item[timeKey]} className="px-4 py-2 text-left text-white font-semibold border border-[#E3F2F1]">
                {type === 'hourly' 
                  ? item[timeKey]
                  : item[timeKey].split('-').slice(1).join('/')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((user, index) => (
            <tr key={user} className={index % 2 === 0 ? 'bg-white' : 'bg-[#F7FDFC]'}>
              <td className="px-4 py-2 font-medium text-[#004B5D] border border-[#E3F2F1]">{user}</td>
              {tableData.map(item => (
                <td key={item[timeKey]} className="px-4 py-2 text-[#004B5D] border border-[#E3F2F1]">
                  {item[user] || ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

DataSummary.propTypes = {
  data: PropTypes.shape({
    dailyCallsData: PropTypes.arrayOf(PropTypes.object),
    dailyMinutesData: PropTypes.arrayOf(PropTypes.object),
    hourlyCallsData: PropTypes.arrayOf(PropTypes.object)
  }).isRequired,
  users: PropTypes.arrayOf(PropTypes.string).isRequired,
  type: PropTypes.oneOf(['calls', 'minutes', 'hourly']).isRequired
};

function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [labelFontSize, setLabelFontSize] = useState(10); // Default font size
  const [labelDx, setLabelDx] = useState(0); // Default dx value

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const rows = text.split('\n').filter(row => row.trim());
        const headers = rows[0].split(',');
        
        const parsedData = rows.slice(1).map(row => {
          const values = [];
          let currentValue = '';
          let withinQuotes = false;
          
          for (let char of row) {
            if (char === '"') {
              withinQuotes = !withinQuotes;
            } else if (char === ',' && !withinQuotes) {
              values.push(currentValue.trim());
              currentValue = '';
            } else {
              currentValue += char;
            }
          }
          values.push(currentValue.trim());
          
          return headers.reduce((obj, header, index) => {
            obj[header] = values[index] || '';
            return obj;
          }, {});
        });
        setData(parsedData);
        setError(null);
      } catch (err) {
        console.error("Error processing file:", err);
        setError(err.message);
      }
    };
    
    reader.readAsText(file);
  };
  
  const statistics = useMemo(() => {
    if (!data) return null;
    
    const validCalls = data.filter(call => 
      call.direction === 'outbound' && 
      call.category === 'outgoing'
    );
    
    const callsByDay = validCalls.reduce((acc, call) => {
      const date = call.date_started.split(' ')[0];
      const person = call.name;
      
      if (!acc[date]) acc[date] = {};
      if (!acc[date][person]) {
        acc[date][person] = {
          calls: 0,
          minutes: 0
        };
      }
      
      acc[date][person].calls += 1;
      
      if (call.talk_duration) {
        const duration = parseFloat(call.talk_duration);
        if (!isNaN(duration)) {
          acc[date][person].minutes += duration;
        }
      }
      
      return acc;
    }, {});
    
    const callsByHour = validCalls.reduce((acc, call) => {
      const hour = parseInt(call.date_started.split(' ')[1].split(':')[0]);
      const person = call.name;
      
      if (!acc[hour]) acc[hour] = {};
      if (!acc[hour][person]) acc[hour][person] = 0;
      
      acc[hour][person] += 1;
      
      return acc;
    }, {});
    
    const dailyCallsData = Object.entries(callsByDay)
      .map(([date, stats]) => ({
        date,
        ...Object.entries(stats).reduce((acc, [person, data]) => ({
          ...acc,
          [person]: data.calls
        }), {})
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    const dailyMinutesData = Object.entries(callsByDay)
      .map(([date, stats]) => ({
        date,
        ...Object.entries(stats).reduce((acc, [person, data]) => ({
          ...acc,
          [person]: parseFloat(data.minutes.toFixed(2))
        }), {})
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
      const hourlyCallsData = Object.entries(callsByHour)
  .map(([hour, stats]) => {
    const hourInt = parseInt(hour, 10);
    const formattedHour = hourInt === 0
      ? '12:00 AM'
      : hourInt < 12
      ? `${hourInt}:00 AM`
      : hourInt === 12
      ? '12:00 PM'
      : `${hourInt - 12}:00 PM`;

    return {
      hour: formattedHour,
      hour24: hourInt, // Store the 24-hour format for sorting
      ...stats
    };
  })
  .sort((a, b) => a.hour24 - b.hour24); // Sort by the 24-hour format

    
      
    return {
      dailyCallsData,
      dailyMinutesData,
      hourlyCallsData
    };
  }, [data]);
  
  const users = useMemo(() => {
    if (!data) return [];
    return [...new Set(data
      .filter(call => 
        call.direction === 'outbound' && 
        call.category === 'outgoing'
      )
      .map(call => call.name)
    )];
  }, [data]);
  const colors = [
    '#2EC4B6', // Teal
    '#F6B93B', // Orange
    '#004B5D', // Dark Blue
    '#8B4B8B', // Purple
    '#FF6F61', // Coral Red
    '#6A0572', // Deep Purple
    '#FFD700', // Gold
    '#17A2B8', // Aqua
    '#FF4500', // Orange Red
    '#7CFC00', // Lawn Green
    '#1E90FF', // Dodger Blue
    '#8A2BE2', // Blue Violet
    '#A52A2A', // Brown
    '#DC143C', // Crimson
    '#32CD32', // Lime Green
    '#4682B4', // Steel Blue
  ];
  

  return (
    <div className="p-8 max-w-7xl mx-auto bg-[#F7FDFC]">
      <h1 className="text-3xl font-bold mb-8 text-[#004B5D]">Outbound Call Analytics Dashboard</h1>
      
      <div className="mb-8">
        <label className="block text-sm font-medium mb-2 text-[#004B5D]">Upload Call Log CSV</label>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="block w-full text-sm border border-[#2EC4B6] rounded p-2 text-[#004B5D] focus:outline-none focus:ring-2 focus:ring-[#2EC4B6]"
        />
        {error && (
          <div className="mt-2 text-red-600">
            Error: {error}
          </div>
        )}
      </div>
      <div className="mb-8">
  <label className="block text-sm font-medium mb-2 text-[#004B5D]">Label Font Size</label>
  <input
    type="number"
    value={labelFontSize}
    onChange={(e) => setLabelFontSize(Number(e.target.value))}
    className="block w-full text-sm border border-[#2EC4B6] rounded p-2 text-[#004B5D] focus:outline-none focus:ring-2 focus:ring-[#2EC4B6]"
    placeholder="Enter font size"
  />
</div>

<div className="mb-8">
  <label className="block text-sm font-medium mb-2 text-[#004B5D]">Label dx (Horizontal Offset)</label>
  <input
    type="number"
    value={labelDx}
    onChange={(e) => setLabelDx(Number(e.target.value))}
    className="block w-full text-sm border border-[#2EC4B6] rounded p-2 text-[#004B5D] focus:outline-none focus:ring-2 focus:ring-[#2EC4B6]"
    placeholder="Enter dx value"
  />
</div>

      {statistics && users.length > 0 && (
        <div className="space-y-12">
          {/* Calls per day */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="bg-white p-6 rounded-lg shadow border border-[#E3F2F1]">
                <h2 className="text-xl font-semibold mb-4 text-[#004B5D]">Outbound Calls per Day</h2>
                <div className="w-full h-[400px]">
                  <BarChart
                    width={800}
                    height={400}
                    data={statistics.dailyCallsData}
                    margin={{ top: 30, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E3F2F1" />
                    <XAxis dataKey="date" tick={{ fill: '#004B5D' }} />
                    <YAxis tick={{ fill: '#004B5D' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white',
                        border: '1px solid #E3F2F1'
                      }}
                    />
                    <Legend />
                    {users.map((user, index) => (
                      <Bar 
                        key={user}
                        dataKey={user}
                        fill={colors[index]}
                        label={{
                          position: 'top',
                          fill: '#004B5D',
                          style: { fontSize: `${labelFontSize}px` }, // Use dynamic font size
                          angle: -90, // Rotate vertically
                          dx: labelDx, // Use dynamic dx
                          dy: -10, // Adjust vertical offset if needed
                        }}
                      />
                    ))}
                  </BarChart>
                </div>
              </div>
            </div>
            <div className="w-[900px]">
              <DataSummary data={statistics} users={users} type="calls" />
            </div>
          </div>
          
          {/* Minutes per day */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="bg-white p-6 rounded-lg shadow border border-[#E3F2F1]">
                <h2 className="text-xl font-semibold mb-4 text-[#004B5D]">Outbound Call Minutes per Day</h2>
                <div className="w-full h-[400px]">
                  <BarChart
                    width={800}
                    height={400}
                    data={statistics.dailyMinutesData}
                    margin={{ top: 30, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E3F2F1" />
                    <XAxis dataKey="date" tick={{ fill: '#004B5D' }} />
                    <YAxis tick={{ fill: '#004B5D' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E3F2F1'
                      }}
                    />
                    <Legend />
                    {users.map((user, index) => (
                      <Bar
                        key={user}
                        dataKey={user}
                        fill={colors[index]}
                        label={{
                          position: 'top',
                          fill: '#004B5D',
                          style: { fontSize: `${labelFontSize}px` }, // Use dynamic font size
                          angle: -90, // Rotate vertically
                          dx: labelDx, // Use dynamic dx
                          dy: -10, // Adjust vertical offset if needed
                        }}
                      />
                    ))}
                  </BarChart>
                </div>
              </div>
            </div>
            <div className="w-[900px]">
              <DataSummary data={statistics} users={users} type="minutes" />
            </div>
          </div>
          
          {/* Calls per hour */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="bg-white p-6 rounded-lg shadow border border-[#E3F2F1]">
                <h2 className="text-xl font-semibold mb-4 text-[#004B5D]">Outbound Calls per Hour</h2>
                <div className="w-full h-[400px]">
                  <BarChart
                    width={800}
                    height={400}
                    data={statistics.hourlyCallsData}
                    margin={{ top: 30, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E3F2F1" />
                    <XAxis dataKey="hour" tick={{ fill: '#004B5D' }} />
                    <YAxis tick={{ fill: '#004B5D' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E3F2F1'
                      }}
                    />
                    <Legend />
                    {users.map((user, index) => (
                      <Bar
                        key={user}
                        dataKey={user}
                        fill={colors[index]}
                        //label={{ position: 'top', fill: '#004B5D', style: { fontSize: '10px' }, angle: -90, dx: 2, dy: -10,}}
                      />
                    ))}
                  </BarChart>
                </div>
              </div>
            </div>
            <div className="w-[1000px]">
              <DataSummary data={statistics} users={users} type="hourly" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
