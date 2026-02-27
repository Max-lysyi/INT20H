import React, { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
import {
  Upload,
  Plus,
  MapPin,
  DollarSign,
  FileText,
  X,
  Loader2,
  Lock,
  Trash2,
  Filter,
  Calculator, 
} from "lucide-react";

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:10000'
  : 'https://int20h-4ei5.onrender.com';

const LoginScreen = ({ onLogin }) => {
  useEffect(() => {
    document.title = "LoginScreen";
  }, []);

  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === "fitherin322") {
      onLogin();
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full border border-stone-200">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-[#D9534F]/10 rounded-full flex items-center justify-center text-[#D9534F]">
            <Lock size={32} />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Admin Access
        </h2>
        <p className="text-center text-gray-500 mb-6">
          Please enter your password to continue.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 transition ${
                error
                  ? "border-red-500 focus:ring-red-200"
                  : "border-stone-300 focus:ring-[#D9534F]/20 focus:border-[#D9534F]"
              }`}
              placeholder="Password"
            />
            {error && (
              <p className="text-red-500 text-sm mt-2 ml-1">
                Incorrect password
              </p>
            )}
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-[#D9534F] hover:bg-[#c94b47] text-white font-semibold rounded-xl transition shadow-md active:scale-95"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

const AdminPanel = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrdersCount, setTotalOrdersCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOrderForm, setNewOrderForm] = useState({
    latitude: "",
    longitude: "",
    subtotal: "",
  });

  const [previewData, setPreviewData] = useState({
    jurisdiction: "—",
    tax: 0,
    total: 0,
  });

  const fileInputRef = useRef(null);

  useEffect(() => {
    const lat = parseFloat(newOrderForm.latitude);
    const lon = parseFloat(newOrderForm.longitude);
    const sub = parseFloat(newOrderForm.subtotal);

    if (!isNaN(lat) && !isNaN(lon) && !isNaN(sub)) {
      let name = "New York State (Other)";
      let rate = 0.04;

      if (lat >= 40.49 && lat <= 40.92 && lon >= -74.26 && lon <= -73.69) {
        name = "New York City";
        rate = 0.08875;
      } else if (lat >= 42.58 && lat <= 42.77 && lon >= -74.0 && lon <= -73.7) {
        name = "Albany County";
        rate = 0.08;
      } else if (
        lat >= 42.99 &&
        lat <= 43.08 &&
        lon >= -76.2 &&
        lon <= -76.07
      ) {
        name = "Syracuse (Onondaga)";
        rate = 0.08;
      } else if (lat >= 40.9 && lat <= 41.0 && lon >= -73.93 && lon <= -73.83) {
        name = "Yonkers";
        rate = 0.08875;
      }

      const tax = sub * rate;
      setPreviewData({
        jurisdiction: name,
        tax: tax,
        total: sub + tax,
      });
    } else {
      setPreviewData({ jurisdiction: "—", tax: 0, total: 0 });
    }
  }, [newOrderForm]);

  const fetchOrders = async (page = 1, search = searchTerm) => {
    try {
      const response = await fetch(
        `${API_URL}/?page=${page}&limit=10&search=${search}`,
      );
      const data = await response.json();

      setOrders(data.data);
      setCurrentPage(data.currentPage);
      setTotalPages(data.totalPages);
      setTotalOrdersCount(data.totalOrders);
    } catch (error) {
      console.error("Error loading orders:", error);
    }
  };

  useEffect(() => {
    document.title = "BetterMe - Delivery Admin";
    fetchOrders(1);
  }, []);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const response = await fetch(`${API_URL}/orders/import`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(results.data),
          });
          if (response.ok) {
            alert(`Success! Imported ${results.data.length} orders.`);
            fetchOrders(1);
          } else {
            alert("Server error during import.");
          }
        } catch (err) {
          console.error("Import failed:", err);
          alert("Network error.");
        } finally {
          setLoading(false);
          event.target.value = null;
        }
      },
    });
  };

  const handleSubmitNewOrder = async () => {
    if (
      !newOrderForm.latitude ||
      !newOrderForm.longitude ||
      !newOrderForm.subtotal
    ) {
      alert("Будь ласка, заповніть всі поля!");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: parseFloat(newOrderForm.latitude),
          longitude: parseFloat(newOrderForm.longitude),
          subtotal: parseFloat(newOrderForm.subtotal),
        }),
      });

      if (response.ok) {
        setIsModalOpen(false);
        setNewOrderForm({ latitude: "", longitude: "", subtotal: "" });
        fetchOrders(1);
      } else {
        alert("Помилка при створенні замовлення.");
      }
    } catch (error) {
      console.error("Помилка:", error);
    }
  };

  const handleClearDb = async () => {
    if (
      window.confirm("Ви впевнені, що хочете видалити ВСІ замовлення з бази?")
    ) {
      try {
        await fetch(`${API_URL}/orders`, { method: "DELETE" });
        fetchOrders(1);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-gray-800 font-sans">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".csv"
        style={{ display: "none" }}
      />

      <nav className="bg-white border-b border-stone-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="font-bold text-2xl tracking-tight text-gray-900">
            Better<span className="text-[#D9534F]">Me</span>{" "}
            <span className="text-gray-400 font-normal text-sm ml-2">
              | Delivery Admin
            </span>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-stone-100 rounded-lg transition">
            <FileText size={18} /> Documentation
          </button>
          <div className="w-8 h-8 bg-[#D9534F] rounded-full text-white flex items-center justify-center font-bold text-xs">
            JD
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Orders Management
            </h1>
            <p className="text-gray-500 mt-1">
              Manage delivery taxes and order status across NY State.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleClearDb}
              className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 rounded-xl text-sm font-medium transition border border-transparent hover:border-red-100"
            >
              <Trash2 size={16} /> Clear DB
            </button>

            <button
              onClick={() => fileInputRef.current.click()}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-stone-300 shadow-sm rounded-xl font-medium text-gray-700 hover:bg-stone-50 transition disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Upload size={18} />
              )}
              {loading ? "Processing..." : "Import CSV"}
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#D9534F] text-white shadow-md rounded-xl font-medium hover:bg-[#c94b47] transition hover:shadow-lg transform active:scale-95"
            >
              <Plus size={18} /> New Order
            </button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm mb-6 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-3 items-center">
            <div className="relative">
              <Filter
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Search ID or City..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  fetchOrders(1, e.target.value);
                }}
                className="pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D9534F]/20 focus:border-[#D9534F] w-64 transition"
              />
            </div>
          </div>
          <div className="text-sm text-gray-500">
            Total Orders Found:{" "}
            <span className="font-bold text-gray-900 text-lg">
              {totalOrdersCount}
            </span>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          <div className="flex-grow overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Location (Lat, Lon)</th>
                  <th className="px-6 py-4">Jurisdiction</th>
                  <th className="px-6 py-4 text-right">Subtotal</th>
                  <th className="px-6 py-4 text-right">Tax</th>
                  <th className="px-6 py-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {orders.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-6 py-12 text-center text-gray-400"
                    >
                      No orders found. Try importing a CSV file or creating a
                      new order.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-[#FDFBF7] transition group"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {order.id}
                      </td>
                      <td className="px-6 py-4 text-gray-600 flex items-center gap-2">
                        <MapPin size={14} className="text-[#D9534F]" />
                        {Number(order.latitude).toFixed(4)},{" "}
                        {Number(order.longitude).toFixed(4)}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        <span className="px-2 py-1 bg-stone-100 rounded text-xs border border-stone-200 font-medium">
                          {order.jurisdiction}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600 font-mono">
                        ${Number(order.subtotal).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right text-[#D9534F] font-mono font-medium">
                        +${Number(order.tax_amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900 font-mono">
                        ${Number(order.total_amount).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-stone-50 px-6 py-4 border-t border-stone-200 flex justify-between items-center">
            <span className="text-sm text-gray-500">
              Page{" "}
              <span className="font-medium text-gray-900">{currentPage}</span>{" "}
              of <span className="font-medium text-gray-900">{totalPages}</span>
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => fetchOrders(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white border border-stone-300 rounded-lg text-sm text-gray-600 hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
              >
                Previous
              </button>
              <button
                onClick={() => fetchOrders(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white border border-stone-300 rounded-lg text-sm text-gray-600 hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h3 className="text-xl font-bold text-gray-900">
                Create New Order
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subtotal ($)
                </label>
                <div className="relative">
                  <DollarSign
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={16}
                  />
                  <input
                    type="number"
                    value={newOrderForm.subtotal}
                    onChange={(e) =>
                      setNewOrderForm({
                        ...newOrderForm,
                        subtotal: e.target.value,
                      })
                    }
                    className="w-full pl-9 pr-4 py-2.5 bg-stone-50 border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-[#D9534F]/20 focus:border-[#D9534F] transition"
                    placeholder="e.g. 100.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={newOrderForm.latitude}
                    onChange={(e) =>
                      setNewOrderForm({
                        ...newOrderForm,
                        latitude: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-[#D9534F]/20 focus:border-[#D9534F] transition"
                    placeholder="40.7128"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={newOrderForm.longitude}
                    onChange={(e) =>
                      setNewOrderForm({
                        ...newOrderForm,
                        longitude: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-[#D9534F]/20 focus:border-[#D9534F] transition"
                    placeholder="-74.0060"
                  />
                </div>
              </div>

              <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
                <div className="flex items-center gap-2 mb-2 text-stone-500 text-xs uppercase font-bold tracking-wider">
                  <Calculator size={14} /> Estimated Breakdown
                </div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Jurisdiction:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {previewData.jurisdiction}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Tax:</span>
                  <span className="text-sm font-medium text-[#D9534F]">
                    +${previewData.tax.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 mt-2 border-t border-stone-200">
                  <span className="text-base font-bold text-gray-800">
                    Total:
                  </span>
                  <span className="text-base font-bold text-gray-900">
                    ${previewData.total.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitNewOrder}
                  className="px-6 py-2 bg-[#D9534F] text-white rounded-lg hover:bg-[#c94b47] font-semibold shadow-md active:scale-95 transition"
                >
                  Save Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  return <AdminPanel />;
};

export default App;
