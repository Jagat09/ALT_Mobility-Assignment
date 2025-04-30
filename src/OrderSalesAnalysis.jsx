import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
  ComposedChart, Area
} from 'recharts';

const OrderSalesAnalysis = () => {
  const [data, setData] = useState({
    orders: [],
    ordersByStatus: [],
    salesByStatus: [],
    monthlySales: [],
    salesByQuarter: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

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

        // Process the data for different visualizations
        
        // 1. Orders by status
        const ordersByStatus = _.chain(orders)
          .countBy('order_status')
          .map((count, status) => ({ 
            status, 
            count,
            percentage: (count / orders.length * 100).toFixed(2)
          }))
          .value();
          
        // 2. Sales by status
        const salesByStatus = _.chain(orders)
          .groupBy('order_status')
          .map((group, status) => ({
            status,
            total: _.sumBy(group, 'order_amount').toFixed(2),
            average: (_.sumBy(group, 'order_amount') / group.length).toFixed(2),
            count: group.length
          }))
          .value();
          
        // 3. Monthly sales trend
        const monthlySales = _.chain(orders)
          .groupBy(order => order.order_date.substring(0, 7))
          .map((group, yearMonth) => ({
            yearMonth,
            year: yearMonth.substring(0, 4),
            month: yearMonth.substring(5, 7),
            orderCount: group.length,
            totalSales: _.sumBy(group, 'order_amount').toFixed(2),
            averageOrderValue: (_.sumBy(group, 'order_amount') / group.length).toFixed(2)
          }))
          .sortBy('yearMonth')
          .value();
          
        // 4. Sales by quarter
        const getQuarter = (month) => {
          const m = parseInt(month);
          if (m <= 3) return 'Q1';
          if (m <= 6) return 'Q2';
          if (m <= 9) return 'Q3';
          return 'Q4';
        };
        
        const salesByQuarter = _.chain(orders)
          .groupBy(order => {
            const year = order.order_date.substring(0, 4);
            const month = order.order_date.substring(5, 7);
            return `${year} ${getQuarter(month)}`;
          })
          .map((group, yearQuarter) => ({
            yearQuarter,
            orderCount: group.length,
            totalSales: _.sumBy(group, 'order_amount').toFixed(2)
          }))
          .sortBy('yearQuarter')
          .value();
        
        setData({
          orders,
          ordersByStatus,
          salesByStatus,
          monthlySales,
          salesByQuarter
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
    const totalOrders = data.orders.length;
    const totalSales = _.sumBy(data.orders, 'order_amount').toFixed(2);
    const averageOrderValue = (totalSales / totalOrders).toFixed(2);
    
    return (
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Overview</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-500 mb-1">Total Orders</div>
            <div className="text-2xl font-bold">{totalOrders.toLocaleString()}</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-500 mb-1">Total Sales</div>
            <div className="text-2xl font-bold">{formatCurrency(totalSales)}</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-500 mb-1">Average Order Value</div>
            <div className="text-2xl font-bold">{formatCurrency(averageOrderValue)}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="text-lg font-medium mb-3">Orders by Status</h4>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.ordersByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="status"
                  label={({ status, percentage }) => `${status}: ${percentage}%`}
                >
                  {data.ordersByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="text-lg font-medium mb-3">Sales by Status</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.salesByStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis tickFormatter={(value) => `$${value/1000}k`} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar 
                  dataKey="total" 
                  fill="#0088FE" 
                  name="Total Sales" 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  const SalesAnalysis = () => {
    // Filter to show last 24 months for trend visualization
    const recentMonthlyData = _.takeRight(data.monthlySales, 24);
    
    return (
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Sales Analysis</h3>
        
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h4 className="text-lg font-medium mb-3">Monthly Sales Trend (Last 24 Months)</h4>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={recentMonthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="yearMonth" 
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                }}
              />
              <YAxis 
                yAxisId="left" 
                tickFormatter={(value) => `$${value/1000}k`} 
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                tickFormatter={(value) => value.toLocaleString()} 
              />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'totalSales') return formatCurrency(value);
                  if (name === 'orderCount') return value.toLocaleString();
                  return value;
                }}
                labelFormatter={(label) => {
                  const date = new Date(label);
                  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="totalSales" 
                yAxisId="left" 
                fill="rgba(0, 136, 254, 0.2)" 
                stroke="#0088FE" 
                name="Total Sales" 
              />
              <Line 
                type="monotone" 
                dataKey="orderCount" 
                yAxisId="right" 
                stroke="#FF8042" 
                name="Order Count" 
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="text-lg font-medium mb-3">Quarterly Sales Trend</h4>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data.salesByQuarter}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="yearQuarter" />
              <YAxis tickFormatter={(value) => `$${value/1000}k`} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar 
                dataKey="totalSales" 
                fill="#00C49F" 
                name="Total Sales" 
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const OrderDetails = () => {
    // Calculate average order value by status
    const aovByStatus = data.salesByStatus.map(item => ({
      status: item.status,
      average: item.average
    }));
    
    return (
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Order Details</h3>
        
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h4 className="text-lg font-medium mb-3">Average Order Value by Status</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={aovByStatus}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar 
                dataKey="average" 
                fill="#8884d8" 
                name="Average Order Value" 
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gray-200 text-gray-700">
                <th className="py-2 px-4 text-left">Status</th>
                <th className="py-2 px-4 text-right">Order Count</th>
                <th className="py-2 px-4 text-right">Total Sales</th>
                <th className="py-2 px-4 text-right">Average Order Value</th>
                <th className="py-2 px-4 text-right">% of Total Orders</th>
              </tr>
            </thead>
            <tbody>
              {data.salesByStatus.map(row => (
                <tr key={row.status} className="border-b hover:bg-gray-100">
                  <td className="py-2 px-4 text-left capitalize">{row.status}</td>
                  <td className="py-2 px-4 text-right">{row.count.toLocaleString()}</td>
                  <td className="py-2 px-4 text-right">{formatCurrency(row.total)}</td>
                  <td className="py-2 px-4 text-right">{formatCurrency(row.average)}</td>
                  <td className="py-2 px-4 text-right">
                    {(row.count / data.orders.length * 100).toFixed(2)}%
                  </td>
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
    
    switch (activeTab) {
      case 'overview':
        return <Overview />;
      case 'sales':
        return <SalesAnalysis />;
      case 'orders':
        return <OrderDetails />;
      default:
        return <Overview />;
    }
  };

  return (
    <div className="max-w-full mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Order and Sales Analysis Dashboard</h2>
      
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
              activeTab === 'sales' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('sales')}
          >
            Sales Analysis
          </button>
          <button 
            className={`py-2 px-1 font-medium ${
              activeTab === 'orders' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('orders')}
          >
            Order Details
          </button>
        </nav>
      </div>
      
      {renderContent()}
    </div>
  );
};

export default OrderSalesAnalysis;