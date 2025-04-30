import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, LineChart, Line
} from 'recharts';

const CustomerRetentionAnalysis = () => {
  const [cohortData, setCohortData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedView, setSelectedView] = useState('heatmap');
  const [selectedCohort, setSelectedCohort] = useState(null);

  useEffect(() => {
    const processData = async () => {
      try {
        setIsLoading(true);
        
        // Read the customer orders data
        const ordersResponse = await fetch('/customer_orders.csv').then(res => res.text());

        
        // Parse the CSV data
        const orders = Papa.parse(ordersResponse, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true
        }).data;
        
        // Add year-month field to orders for cohort analysis
        const ordersWithYearMonth = orders.map(order => ({
          ...order,
          yearMonth: order.order_date.substring(0, 7)
        }));
        
        // Determine first purchase month for each customer
        const customerFirstPurchase = _.chain(ordersWithYearMonth)
          .groupBy('customer_id')
          .mapValues(orders => 
            _.chain(orders)
              .sortBy('order_date')
              .first()
              .get('yearMonth')
              .value()
          )
          .value();
        
        // Get all distinct year-months in the dataset
        const allYearMonths = _.chain(ordersWithYearMonth)
          .map('yearMonth')
          .uniq()
          .sortBy()
          .value();
        
        // Create cohort data for visualization
        const cohortData = _.chain(allYearMonths)
          .take(12) // First 12 cohorts for visualization
          .map(cohortMonth => {
            // Get customers who first purchased in this cohort
            const cohortCustomers = _.chain(customerFirstPurchase)
              .toPairs()
              .filter(([_, firstMonth]) => firstMonth === cohortMonth)
              .map(([customerId]) => parseInt(customerId))
              .value();
            
            if (cohortCustomers.length === 0) {
              return null;
            }
            
            // For each subsequent month, calculate how many customers returned
            const retentionByMonth = allYearMonths
              .filter(month => month >= cohortMonth)
              .slice(0, 13) // Limit to 12 months after cohort for visualization
              .map((month, idx) => {
                // Find customers from the cohort who purchased in this month
                const activeCustomers = _.chain(ordersWithYearMonth)
                  .filter(order => 
                    order.yearMonth === month && 
                    cohortCustomers.includes(order.customer_id)
                  )
                  .map('customer_id')
                  .uniq()
                  .value();
                
                return {
                  cohort: cohortMonth,
                  month: month,
                  monthIdx: idx,
                  monthsSinceCohort: idx,
                  customers: activeCustomers.length,
                  retentionRate: cohortCustomers.length > 0 
                    ? (activeCustomers.length / cohortCustomers.length * 100).toFixed(2) 
                    : 0,
                  retentionPercent: cohortCustomers.length > 0 
                    ? (activeCustomers.length / cohortCustomers.length) 
                    : 0
                };
              });
              
            return {
              cohort: cohortMonth,
              cohortSize: cohortCustomers.length,
              retention: retentionByMonth
            };
          })
          .filter(Boolean)
          .value();
          
        // Create a flattened dataset for heat map visualization
        const flatCohortData = _.flatMap(cohortData, cohort => 
          cohort.retention.map(r => ({
            cohort: r.cohort,
            month: r.month,
            monthNumber: r.monthIdx,
            retention: parseFloat(r.retentionRate),
            customers: r.customers,
            cohortSize: cohort.cohortSize
          }))
        );
        
        setCohortData(cohortData);
        setIsLoading(false);
      } catch (error) {
        console.error("Error processing data:", error);
        setError("Failed to process data. Please check the console for details.");
        setIsLoading(false);
      }
    };
    
    processData();
  }, []);

  const formatCohortMonth = (cohortMonth) => {
    const [year, month] = cohortMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString('default', { month: 'short', year: 'numeric' });
  };

  const CohortLineChart = ({ cohortData }) => {
    const cohortForChart = selectedCohort ? 
      cohortData.find(c => c.cohort === selectedCohort) : 
      cohortData[0];
    
    const data = cohortForChart?.retention.map(r => ({
      month: r.monthsSinceCohort,
      retention: parseFloat(r.retentionRate)
    })) || [];
    
    return (
      <div className="mt-6">
        <h3 className="text-lg font-medium mb-2">
          Retention Rate Over Time for Cohort: {formatCohortMonth(cohortForChart?.cohort)}
        </h3>
        <div className="mb-4">
          <label className="block mb-1">Select Cohort:</label>
          <select 
            className="border p-1 rounded"
            value={selectedCohort || cohortData[0]?.cohort}
            onChange={(e) => setSelectedCohort(e.target.value)}
          >
            {cohortData.map(cohort => (
              <option key={cohort.cohort} value={cohort.cohort}>
                {formatCohortMonth(cohort.cohort)} (Size: {cohort.cohortSize})
              </option>
            ))}
          </select>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={data}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="month" 
              label={{ value: 'Months Since First Purchase', position: 'insideBottom', offset: -5 }} 
            />
            <YAxis 
              label={{ value: 'Retention Rate (%)', angle: -90, position: 'insideLeft' }}
              domain={[0, 100]}
            />
            <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="retention" 
              stroke="#3B82F6" 
              strokeWidth={2}
              name="Retention Rate"
              dot={{ r: 4 }}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const CohortSummary = () => {
    const summary = cohortData.map(cohort => {
      const m1Retention = cohort.retention[1]?.retentionRate || '0.00';
      const m3Retention = cohort.retention[3]?.retentionRate || '0.00';
      const m6Retention = cohort.retention[6]?.retentionRate || '0.00';
      const m12Retention = cohort.retention[12]?.retentionRate || '0.00';
      
      return {
        cohort: cohort.cohort,
        cohortSize: cohort.cohortSize,
        m1Retention,
        m3Retention,
        m6Retention,
        m12Retention
      };
    });
    
    return (
      <div className="mt-6">
        <h3 className="text-lg font-medium mb-2">Cohort Retention Summary</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gray-200 text-gray-700">
                <th className="py-2 px-4 text-left">Cohort</th>
                <th className="py-2 px-4 text-right">Size</th>
                <th className="py-2 px-4 text-right">Month 1</th>
                <th className="py-2 px-4 text-right">Month 3</th>
                <th className="py-2 px-4 text-right">Month 6</th>
                <th className="py-2 px-4 text-right">Month 12</th>
              </tr>
            </thead>
            <tbody>
              {summary.map(row => (
                <tr key={row.cohort} className="border-b hover:bg-gray-100">
                  <td className="py-2 px-4 text-left">{formatCohortMonth(row.cohort)}</td>
                  <td className="py-2 px-4 text-right">{row.cohortSize}</td>
                  <td className="py-2 px-4 text-right">{row.m1Retention}%</td>
                  <td className="py-2 px-4 text-right">{row.m3Retention}%</td>
                  <td className="py-2 px-4 text-right">{row.m6Retention}%</td>
                  <td className="py-2 px-4 text-right">{row.m12Retention}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return <p className="text-center py-6">Loading data...</p>;
    }
    
    if (error) {
      return <p className="text-center py-6 text-red-500">{error}</p>;
    }
    
    if (!cohortData || cohortData.length === 0) {
      return <p className="text-center py-6">No cohort data available.</p>;
    }
    
    return (
      <>
        <div className="flex justify-center mb-6">
          <div className="flex space-x-2">
            <button 
              className={`px-4 py-2 rounded-lg ${selectedView === 'line' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              onClick={() => setSelectedView('line')}
            >
              Line Chart
            </button>
            <button 
              className={`px-4 py-2 rounded-lg ${selectedView === 'summary' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              onClick={() => setSelectedView('summary')}
            >
              Summary Table
            </button>
          </div>
        </div>
        
        {selectedView === 'line' && <CohortLineChart cohortData={cohortData} />}
        {selectedView === 'summary' && <CohortSummary />}
      </>
    );
  };

  return (
    <div className="max-w-full mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Customer Retention Analysis</h2>
      <p className="mb-6">
        This analysis shows how many customers from each monthly cohort made repeat purchases 
        in subsequent months. The retention rate is calculated as the percentage of customers 
        from the original cohort who made at least one purchase in each following month.
      </p>
      {renderContent()}
    </div>
  );
};

export default CustomerRetentionAnalysis;