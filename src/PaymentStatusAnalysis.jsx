import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line
} from 'recharts';

const PaymentStatusAnalysis = () => {
  const [data, setData] = useState({
    payments: [],
    statusDistribution: [],
    methodDistribution: [],
    successRateByMethod: [],
    monthlyPaymentStatus: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  const STATUS_COLORS = {
    'completed': '#4CAF50',
    'failed': '#F44336',
    'pending': '#FFC107'
  };

  useEffect(() => {
    const processData = async () => {
      try {
        setIsLoading(true);
        
        // Read the payments data
        const ordersResponse = await fetch('/customer_orders.csv').then(res => res.text());

        
        // Parse the CSV data
        const paymentsResponse = await fetch('/payments.csv').then(res => res.text());
const payments = Papa.parse(paymentsResponse, {
  header: true,
  dynamicTyping: true,
  skipEmptyLines: true
}).data;

        // Process the data for different visualizations
        
        // 1. Payment status distribution
        const statusDistribution = _.chain(payments)
          .countBy('payment_status')
          .map((count, status) => ({ 
            status, 
            count,
            percentage: (count / payments.length * 100).toFixed(2)
          }))
          .value();
          
        // 2. Payment method distribution
        const methodDistribution = _.chain(payments)
          .countBy('payment_method')
          .map((count, method) => ({ 
            method, 
            count,
            percentage: (count / payments.length * 100).toFixed(2)
          }))
          .value();
          
        // 3. Payment success rate by method
        const successRateByMethod = _.chain(payments)
          .groupBy('payment_method')
          .map((group, method) => {
            const completed = group.filter(p => p.payment_status === 'completed').length;
            const failed = group.filter(p => p.payment_status === 'failed').length;
            const pending = group.filter(p => p.payment_status === 'pending').length;
            
            return {
              method,
              completed,
              failed,
              pending,
              total: group.length,
              successRate: (completed / group.length * 100).toFixed(2),
              failureRate: (failed / group.length * 100).toFixed(2),
              pendingRate: (pending / group.length * 100).toFixed(2),
              totalAmount: _.sumBy(group, 'payment_amount').toFixed(2)
            };
          })
          .value();
          
        // 4. Monthly payment status
        const monthlyPaymentStatus = _.chain(payments)
          .groupBy(payment => payment.payment_date.substring(0, 7))
          .map((group, yearMonth) => {
            const completed = group.filter(p => p.payment_status === 'completed').length;
            const failed = group.filter(p => p.payment_status === 'failed').length;
            const pending = group.filter(p => p.payment_status === 'pending').length;
            
            return {
              yearMonth,
              completed,
              failed,
              pending,
              total: group.length,
              successRate: (completed / group.length * 100).toFixed(2)
            };
          })
          .sortBy('yearMonth')
          .value();
        
        setData({
          payments,
          statusDistribution,
          methodDistribution,
          successRateByMethod,
          monthlyPaymentStatus
        });
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error processing data:", error);
        setError("Failed to process data. Please check the console for details.");
        setIsLoading(false);
      }
    };
    
    processData();
  }, []);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const Overview = () => {
    const totalPayments = data.payments.length;
    const completedPayments = data.payments.filter(p => p.payment_status === 'completed').length;
    const totalAmount = _.sumBy(data.payments, 'payment_amount').toFixed(2);
    const successRate = (completedPayments / totalPayments * 100).toFixed(2);
    
    return (
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Payment Overview</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-500 mb-1">Total Payments</div>
            <div className="text-2xl font-bold">{totalPayments.toLocaleString()}</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-500 mb-1">Completed Payments</div>
            <div className="text-2xl font-bold text-green-600">{completedPayments.toLocaleString()}</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-500 mb-1">Success Rate</div>
            <div className="text-2xl font-bold">{successRate}%</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-500 mb-1">Total Amount</div>
            <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="text-lg font-medium mb-3">Payment Status Distribution</h4>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="status"
                  label={({ status, percentage }) => `${status}: ${percentage}%`}
                >
                  {data.statusDistribution.map((entry) => (
                    <Cell key={`cell-${entry.status}`} fill={STATUS_COLORS[entry.status] || '#8884d8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="text-lg font-medium mb-3">Payment Method Distribution</h4>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.methodDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="method"
                  label={({ method, percentage }) => `${method}: ${percentage}%`}
                >
                  {data.methodDistribution.map((entry, index) => (
                    <Cell key={`cell-${entry.method}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  const MethodAnalysis = () => {
    return (
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Payment Method Analysis</h3>
        
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h4 className="text-lg font-medium mb-3">Success Rate by Payment Method</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.successRateByMethod}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="method" />
              <YAxis tickFormatter={(value) => `${value}%`} domain={[0, 100]} />
              <Tooltip formatter={(value) => `${value}%`} />
              <Legend />
              <Bar 
                dataKey="successRate" 
                fill="#4CAF50" 
                name="Success Rate" 
              />
              <Bar 
                dataKey="failureRate" 
                fill="#F44336" 
                name="Failure Rate" 
              />
              <Bar 
                dataKey="pendingRate" 
                fill="#FFC107" 
                name="Pending Rate" 
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="text-lg font-medium mb-3">Payment Volume by Method</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-200 text-gray-700">
                  <th className="py-2 px-4 text-left">Payment Method</th>
                  <th className="py-2 px-4 text-right">Total Payments</th>
                  <th className="py-2 px-4 text-right">Completed</th>
                  <th className="py-2 px-4 text-right">Failed</th>
                  <th className="py-2 px-4 text-right">Pending</th>
                  <th className="py-2 px-4 text-right">Success Rate</th>
                  <th className="py-2 px-4 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.successRateByMethod.map(row => (
                  <tr key={row.method} className="border-b hover:bg-gray-100">
                    <td className="py-2 px-4 text-left capitalize">{row.method}</td>
                    <td className="py-2 px-4 text-right">{row.total.toLocaleString()}</td>
                    <td className="py-2 px-4 text-right text-green-600">{row.completed.toLocaleString()}</td>
                    <td className="py-2 px-4 text-right text-red-600">{row.failed.toLocaleString()}</td>
                    <td className="py-2 px-4 text-right text-yellow-600">{row.pending.toLocaleString()}</td>
                    <td className="py-2 px-4 text-right">{row.successRate}%</td>
                    <td className="py-2 px-4 text-right">{formatCurrency(row.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const TrendsAnalysis = () => {
    // Filter to show last 24 months for trend visualization
    const recentMonthlyData = _.takeRight(data.monthlyPaymentStatus, 24);
    
    return (
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Payment Trends Analysis</h3>
        
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h4 className="text-lg font-medium mb-3">Payment Success Rate Trend (Last 24 Months)</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={recentMonthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="yearMonth" 
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                }}
              />
              <YAxis 
                tickFormatter={(value) => `${value}%`} 
                domain={[0, 100]}
              />
              <Tooltip 
                formatter={(value) => `${value}%`}
                labelFormatter={(label) => {
                  const date = new Date(label);
                  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="successRate" 
                stroke="#4CAF50" 
                name="Success Rate" 
                dot={{ r: 4 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="text-lg font-medium mb-3">Payment Status by Month (Last 24 Months)</h4>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={recentMonthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="yearMonth" 
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                }}
              />
              <YAxis />
              <Tooltip 
                formatter={(value) => value.toLocaleString()}
                labelFormatter={(label) => {
                  const date = new Date(label);
                  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                }}
              />
              <Legend />
              <Bar 
                dataKey="completed" 
                stackId="a" 
                fill="#4CAF50" 
                name="Completed" 
              />
              <Bar 
                dataKey="failed" 
                stackId="a" 
                fill="#F44336" 
                name="Failed" 
              />
              <Bar 
                dataKey="pending" 
                stackId="a" 
                fill="#FFC107" 
                name="Pending" 
              />
            </BarChart>
          </ResponsiveContainer>
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
    
    switch (activeTab) {
      case 'overview':
        return <Overview />;
      case 'methods':
        return <MethodAnalysis />;
      case 'trends':
        return <TrendsAnalysis />;
      default:
        return <Overview />;
    }
  };

  return (
    <div className="max-w-full mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Payment Status Analysis</h2>
      
      <div className="border-b mb-6">
        <nav className="flex space-x-6">
          <button 
            className={`py-2 px-1 font-medium ${
              activeTab === 'overview' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`py-2 px-1 font-medium ${
              activeTab === 'methods' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('methods')}
          >
            Payment Methods
          </button>
          <button 
            className={`py-2 px-1 font-medium ${
              activeTab === 'trends' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('trends')}
          >
            Payment Trends
          </button>
        </nav>
      </div>
      
      {renderContent()}
    </div>
  );
};

export default PaymentStatusAnalysis;