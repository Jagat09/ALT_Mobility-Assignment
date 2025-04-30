import React from 'react';
import CustomerAnalysis from './CustomerAnalysis';
import OrderSalesAnalysis from './OrderSalesAnalysis';
import CustomerRetentionAnalysis from './CustomerRetentionAnalysis';
import PaymentStatusAnalysis from './PaymentStatusAnalysis';

function App() {
  return (
    <div className="App">
      <h1 style={{ textAlign: 'center', margin: '20px' }}>Alt Mobility Dashboard</h1>
      <CustomerAnalysis />
      <OrderSalesAnalysis />
      <CustomerRetentionAnalysis />
      <PaymentStatusAnalysis />
    </div>
  );
}

export default App;
