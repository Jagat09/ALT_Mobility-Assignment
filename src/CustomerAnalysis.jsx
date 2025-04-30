import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell,
  ScatterChart, Scatter, ZAxis
} from 'recharts';

const CustomerAnalysis = () => {
  const [data, setData] = useState({
    orders: [],
    orderFrequency: [],
    customerSegments: [],
    topCustomers: [],
    repeatPurchasePatterns: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  const SEGMENT_COLORS = {
    'High Value': '#0088FE',
    'Medium Value': '#00C49F',
    'Low Value': '#FFBB28'
  };

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
        
        // 1. Order frequency distribution
        const ordersByCustomer = _.countBy(orders, 'customer_id');
        const orderFrequency = _.chain(ordersByCustomer)
          .values()
          .countBy()
          .map((count, frequency) => ({ 
            frequency: parseInt(frequency), 
            customers: count,
            percentage: (count / Object.keys(ordersByCustomer).length * 100).toFixed(2)
          }))
          .sortBy('frequency')
          .value();
          
        // 2. Customer segmentation by spending
        const customerSpending = _.chain(orders)
          .groupBy('customer_id')
          .map((orders, customerId) => ({
            customerId: parseInt(customerId),
            totalSpent: _.sumBy(orders, 'order_amount'),
            orderCount: orders.length,
            avgOrderValue: _.sumBy(orders, 'order_amount') / orders.length
          }))
          .value();
          
        const customerSegments = [
          {
            segment: 'High Value',
            threshold: 1000,
            customers: customerSpending.filter(c => c.totalSpent >= 1000).length,
            totalRevenue: _.sumBy(customerSpending.filter(c => c.totalSpent >= 1000), 'totalSpent').toFixed(2),
            avgSpend: (_.sumBy(customerSpending.filter(c => c.totalSpent >= 1000), 'totalSpent') / 
                     customerSpending.filter(c => c.totalSpent >= 1000).length).toFixed(2)
          },
          {
            segment: 'Medium Value',
            threshold: 500,
            customers: customerSpending.filter(c => c.totalSpent >= 500 && c.totalSpent < 1000).length,
            totalRevenue: _.sumBy(customerSpending.filter(c => c.totalSpent >= 500 && c.totalSpent < 1000), 'totalSpent').toFixed(2),
            avgSpend: (_.sumBy(customerSpending.filter(c => c.totalSpent >= 500 && c.totalSpent < 1000), 'totalSpent') / 
                     customerSpending.filter(c => c.totalSpent >= 500 && c.totalSpent < 1000).length).toFixed(2)
          },
          {
            segment: 'Low Value',
            threshold: 0,
            customers: customerSpending.filter(c => c.totalSpent < 500).length,
            totalRevenue: _.sumBy(customerSpending.filter(c => c.totalSpent < 500), 'totalSpent').toFixed(2),
            avgSpend: (_.sumBy(customerSpending.filter(c => c.totalSpent < 500), 'totalSpent') / 
                     customerSpending.filter(c => c.totalSpent < 500).length).toFixed(2)
          }
        ];
        
        // Calculated percentages for customer segments
        const totalCustomers = _.sum(customerSegments.map(s => s.customers));
        const totalRevenue = _.sum(customerSegments.map(s => parseFloat(s.totalRevenue)));
        
        customerSegments.forEach(segment => {
          segment.customerPercentage = (segment.customers / totalCustomers * 100).toFixed(2);
          segment.revenuePercentage = (parseFloat(segment.totalRevenue) / totalRevenue * 100).toFixed(2);
        });
        
        // 3. Top customers by total spending
        const topCustomers = _.chain(customerSpending)
          .sortBy('totalSpent')
          .reverse()
          .take(10)
          .value();
          
        // 4. Repeat purchase patterns
        const customerOrderSequence = {};
        
        orders.forEach(order => {
          if (!customerOrderSequence[order.customer_id]) {
            customerOrderSequence[order.customer_id] = [];
          }
          customerOrderSequence[order.customer_id].push({
            orderId: order.order_id,
            orderDate: order.order_date,
            orderAmount: order.order_amount
          });
        });
        
        // Sort orders by date for each customer
        Object.keys(customerOrderSequence).forEach(customerId => {
          customerOrderSequence[customerId] = _.sortBy(customerOrderSequence[customerId], 'orderDate');
        });
        
        // Calculate average order value by sequence
        const repeatPurchasePatterns = [];
        for (let i = 1; i <= 5; i++) {
          const nthPurchases = [];
          
          Object.keys(customerOrderSequence).forEach(customerId => {
            if (customerOrderSequence[customerId].length >= i) {
              nthPurchases.push(customerOrderSequence[customerId][i-1].orderAmount);
            }
          });
          
          repeatPurchasePatterns.push({
            purchaseNumber: i,
            customers: nthPurchases.length,
            averageOrderValue: (_.sum(nthPurchases) / nthPurchases.length).toFixed(2),
            totalRevenue: _.sum(nthPurchases).toFixed(2)
          });
        }
        
        setData({
          orders,
          orderFrequency,
          customerSegments,
          topCustomers,
          repeatPurchasePatterns
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
    const totalCustomers = data.orders ? _.uniqBy(data.orders, 'customer_id').length : 0;
    const totalOrders = data.orders ? data.orders.length : 0;
    const totalRevenue = data.orders ? _.sumBy(data.orders, 'order_amount').toFixed(2) : 0;
    const averageRevenue = totalCustomers > 0 ? (totalRevenue / totalCustomers).toFixed(2) : 0;
    
    return (
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Customer Overview</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-500 mb-1">Total Customers</div>
            <div className="text-2xl font-bold">{totalCustomers.toLocaleString()}</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-500 mb-1">Total Orders</div>
            <div className="text-2xl font-bold">{totalOrders.toLocaleString()}</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-500 mb-1">Total Revenue</div>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-500 mb-1">Average Revenue per Customer</div>
            <div className="text-2xl font-bold">{formatCurrency(averageRevenue)}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="text-lg font-medium mb-3">Order Frequency Distribution</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.orderFrequency}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="frequency" label={{ value: 'Number of Orders', position: 'insideBottom', offset: -5 }} />
                <YAxis label={{ value: 'Number of Customers', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  formatter={(value, name) => [value.toLocaleString(), 'Customers']}
                  labelFormatter={(value) => `${value} Order${value > 1 ? 's' : ''}`}
                />
                <Legend />
                <Bar dataKey="customers" fill="#0088FE" name="Customers" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="text-lg font-medium mb-3">Customer Segmentation</h4>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.customerSegments}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="customers"
                  nameKey="segment"
                  label={({ segment, customerPercentage }) => `${segment}: ${customerPercentage}%`}
                >
                  {data.customerSegments.map((entry) => (
                    <Cell key={`cell-${entry.segment}`} fill={SEGMENT_COLORS[entry.segment] || '#8884d8'} />
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

  const CustomerSegmentation = () => {
    return (
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Customer Segmentation Analysis</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="text-lg font-medium mb-3">Segment Distribution by Customers</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={data.customerSegments}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="segment" type="category" />
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Legend />
                <Bar dataKey="customers" fill="#0088FE" name="Number of Customers" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="text-lg font-medium mb-3">Segment Distribution by Revenue</h4>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.customerSegments}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="totalRevenue"
                  nameKey="segment"
                  label={({ segment, revenuePercentage }) => `${segment}: ${revenuePercentage}%`}
                >
                  {data.customerSegments.map((entry) => (
                    <Cell key={`cell-${entry.segment}`} fill={SEGMENT_COLORS[entry.segment] || '#8884d8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="text-lg font-medium mb-3">Customer Segments Comparison</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-200 text-gray-700">
                  <th className="py-2 px-4 text-left">Segment</th>
                  <th className="py-2 px-4 text-right">Threshold</th>
                  <th className="py-2 px-4 text-right">Customers</th>
                  <th className="py-2 px-4 text-right">% of Customers</th>
                  <th className="py-2 px-4 text-right">Total Revenue</th>
                  <th className="py-2 px-4 text-right">% of Revenue</th>
                  <th className="py-2 px-4 text-right">Avg. Spend per Customer</th>
                </tr>
              </thead>
              <tbody>
                {data.customerSegments.map(segment => (
                  <tr key={segment.segment} className="border-b hover:bg-gray-100">
                    <td className="py-2 px-4 text-left font-medium">{segment.segment}</td>
                    <td className="py-2 px-4 text-right">
                      {segment.segment === 'Low Value' 
                        ? `< ${formatCurrency(500)}` 
                        : segment.segment === 'Medium Value'
                          ? `${formatCurrency(500)} - ${formatCurrency(999.99)}`
                          : `≥ ${formatCurrency(1000)}`
                      }
                    </td>
                    <td className="py-2 px-4 text-right">{segment.customers.toLocaleString()}</td>
                    <td className="py-2 px-4 text-right">{segment.customerPercentage}%</td>
                    <td className="py-2 px-4 text-right">{formatCurrency(segment.totalRevenue)}</td>
                    <td className="py-2 px-4 text-right">{segment.revenuePercentage}%</td>
                    <td className="py-2 px-4 text-right">{formatCurrency(segment.avgSpend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const RepeatPurchaseAnalysis = () => {
    return (
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Repeat Purchase Analysis</h3>
        
        <div className="grid grid-cols-1 gap-6 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="text-lg font-medium mb-3">Average Order Value by Purchase Number</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.repeatPurchasePatterns}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="purchaseNumber" label={{ value: 'Purchase Number', position: 'insideBottom', offset: -5 }} />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="averageOrderValue" fill="#00C49F" name="Average Order Value" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="text-lg font-medium mb-3">Customer Retention by Purchase Number</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.repeatPurchasePatterns}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="purchaseNumber" />
                <YAxis />
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Legend />
                <Bar dataKey="customers" fill="#8884d8" name="Number of Customers" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="text-lg font-medium mb-3">Revenue by Purchase Number</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.repeatPurchasePatterns}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="purchaseNumber" />
                <YAxis tickFormatter={(value) => `${value/1000}k`} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="totalRevenue" fill="#FF8042" name="Total Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  const TopCustomers = () => {
    return (
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Top Customer Analysis</h3>
        
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h4 className="text-lg font-medium mb-3">Top 10 Customers by Spending</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-200 text-gray-700">
                  <th className="py-2 px-4 text-left">Rank</th>
                  <th className="py-2 px-4 text-left">Customer ID</th>
                  <th className="py-2 px-4 text-right">Total Spent</th>
                  <th className="py-2 px-4 text-right">Order Count</th>
                  <th className="py-2 px-4 text-right">Average Order Value</th>
                </tr>
              </thead>
              <tbody>
                {data.topCustomers.map((customer, index) => (
                  <tr key={customer.customerId} className="border-b hover:bg-gray-100">
                    <td className="py-2 px-4 text-left">{index + 1}</td>
                    <td className="py-2 px-4 text-left">{customer.customerId}</td>
                    <td className="py-2 px-4 text-right">{formatCurrency(customer.totalSpent)}</td>
                    <td className="py-2 px-4 text-right">{customer.orderCount}</td>
                    <td className="py-2 px-4 text-right">{formatCurrency(customer.avgOrderValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="text-lg font-medium mb-3">Order Count vs. Average Order Value</h4>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="orderCount" 
                name="Order Count"
                label={{ value: 'Number of Orders', position: 'insideBottom', offset: -5 }} 
              />
              <YAxis 
                dataKey="avgOrderValue" 
                name="Average Order Value"
                tickFormatter={(value) => formatCurrency(value)}
                label={{ value: 'Average Order Value', angle: -90, position: 'insideLeft' }}
              />
              <ZAxis 
                dataKey="totalSpent" 
                name="Total Spent"
                range={[50, 500]} 
              />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === "Average Order Value") return formatCurrency(value);
                  if (name === "Total Spent") return formatCurrency(value);
                  return value;
                }}
                cursor={{ strokeDasharray: '3 3' }}
              />
              <Legend />
              <Scatter 
                data={data.topCustomers} 
                fill="#8884d8" 
                name="Top Customers" 
              />
            </ScatterChart>
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
      case 'segmentation':
        return <CustomerSegmentation />;
      case 'repeat':
        return <RepeatPurchaseAnalysis />;
      case 'top':
        return <TopCustomers />;
      default:
        return <Overview />;
    }
  };

  return (
    <div className="max-w-full mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Customer Analysis Dashboard</h2>
      
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
              activeTab === 'segmentation' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('segmentation')}
          >
            Customer Segments
          </button>
          <button 
            className={`py-2 px-1 font-medium ${
              activeTab === 'repeat' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('repeat')}
          >
            Repeat Purchases
          </button>
          <button 
            className={`py-2 px-1 font-medium ${
              activeTab === 'top' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('top')}
          >
            Top Customers
          </button>
        </nav>
      </div>
      
      {renderContent()}
    </div>
  );
};

export default CustomerAnalysis;