import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import NewBookingWizard from './pages/NewBookingWizard';
import AdminApprovalsPage from './pages/AdminApprovalsPage';
import BookingsWorklistPage from './pages/BookingsWorklistPage';
import KioskPage from './pages/KioskPage';

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ padding:12, borderBottom:'1px solid #e5e7eb', display:'flex', gap:12 }}>
        <Link to="/new">New Booking</Link>
        <Link to="/admin">Admin</Link>
        <Link to="/bookings">Bookings</Link>
        <Link to="/kiosk">Kiosk</Link>
      </div>
      <Routes>
        <Route path="/new" element={<NewBookingWizard/>} />
        <Route path="/admin" element={<AdminApprovalsPage/>} />
        <Route path="/bookings" element={<BookingsWorklistPage/>} />
        <Route path="/kiosk" element={<KioskPage/>} />
        <Route path="*" element={<NewBookingWizard/>} />
      </Routes>
    </BrowserRouter>
  );
}
