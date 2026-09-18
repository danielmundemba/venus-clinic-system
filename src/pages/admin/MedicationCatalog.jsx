import { useState, useEffect } from "react";
import {
  getMedications,
  addMedicationToCatalog,
  updateMedicationCatalog,
} from "../../firebase/db";
import { useAuditLog } from "../../hooks/useAuditLog";
import {
  Pill,
  Plus,
  Loader2,
  X,
  AlertCircle,
  Package,
  Edit2,
  Save,
} from "lucide-react";

const emptyForm = {
  name: "",
  unitPrice: "",
  stock: "",
  lowStockThreshold: "10",
};

const MedicationCatalog = () => {
  const { logAction } = useAuditLog();
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadMedications();
  }, []);

  const loadMedications = async () => {
    setLoading(true);
    try {
      const meds = await getMedications();
      setMedications(meds.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error("Failed to load medications:", err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  };

  const openEditModal = (med) => {
    setEditingId(med.id);
    setForm({
      name: med.name,
      unitPrice: String(med.unitPrice),
      stock: String(med.stock),
      lowStockThreshold: String(med.lowStockThreshold ?? 10),
    });
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Medication name is required");
      return;
    }
    if (!form.unitPrice || parseFloat(form.unitPrice) < 0) {
      setError("Enter a valid unit price");
      return;
    }
    if (form.stock === "" || parseInt(form.stock) < 0) {
      setError("Enter a valid stock quantity");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        unitPrice: form.unitPrice,
        stock: form.stock,
        lowStockThreshold: form.lowStockThreshold,
      };

      if (editingId) {
        await updateMedicationCatalog(editingId, {
          name: payload.name,
          unitPrice: parseFloat(payload.unitPrice),
          stock: parseInt(payload.stock),
          lowStockThreshold: parseInt(payload.lowStockThreshold),
        });
        await logAction("update", "medication", editingId, {
          name: payload.name,
        });
      } else {
        const docRef = await addMedicationToCatalog(payload);
        await logAction("create", "medication", docRef.id, {
          name: payload.name,
        });
      }

      setShowModal(false);
      await loadMedications();
    } catch (err) {
      console.error("Failed to save medication:", err);
      setError("Failed to save medication: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isLowStock = (med) => med.stock <= (med.lowStockThreshold ?? 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-venus-text-primary">
            Medication Catalog
          </h1>
          <p className="text-venus-text-muted mt-1">
            Manage medications, prices, and stock levels for the pharmacy.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-venus-primary-500 hover:bg-venus-primary-600 text-white rounded-lg text-sm font-medium transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Medication
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-venus-bg-tertiary border-b border-venus-border">
                <th className="text-left text-xs font-semibold text-venus-text-muted uppercase tracking-wider px-6 py-4">
                  Medication
                </th>
                <th className="text-left text-xs font-semibold text-venus-text-muted uppercase tracking-wider px-6 py-4">
                  Unit Price
                </th>
                <th className="text-left text-xs font-semibold text-venus-text-muted uppercase tracking-wider px-6 py-4">
                  Stock
                </th>
                <th className="text-right text-xs font-semibold text-venus-text-muted uppercase tracking-wider px-6 py-4">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-venus-border">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-venus-primary-400 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : medications.length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    className="px-6 py-12 text-center text-venus-text-muted"
                  >
                    No medications in the catalog yet. Add one to get started.
                  </td>
                </tr>
              ) : (
                medications.map((med) => (
                  <tr
                    key={med.id}
                    className="hover:bg-venus-bg-tertiary/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-venus-primary-500/20 rounded-full flex items-center justify-center">
                          <Pill className="w-4 h-4 text-venus-primary-400" />
                        </div>
                        <p className="text-sm font-medium text-venus-text-primary">
                          {med.name}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-venus-text-primary">
                        K{med.unitPrice}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Package
                          className={`w-4 h-4 ${isLowStock(med) ? "text-red-400" : "text-venus-text-muted"}`}
                        />
                        <span
                          className={`text-sm font-medium ${isLowStock(med) ? "text-red-400" : "text-venus-text-primary"}`}
                        >
                          {med.stock}
                        </span>
                        {isLowStock(med) && (
                          <span className="px-1.5 py-0.5 bg-red-500/10 text-red-400 text-[10px] font-bold uppercase tracking-wider rounded border border-red-500/20">
                            Low
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openEditModal(med)}
                        className="p-2 text-venus-text-muted hover:text-venus-primary-400 hover:bg-venus-primary-500/10 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-venus-border shrink-0">
              <h3 className="text-lg font-semibold text-venus-text-primary">
                {editingId ? "Edit Medication" : "Add Medication"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-venus-bg-tertiary rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-venus-text-muted" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-venus-text-primary mb-1.5">
                  Medication Name <span className="text-red-400">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                  placeholder="Amoxicillin"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
                    Unit Price (K) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.unitPrice}
                    onChange={(e) =>
                      setForm({ ...form, unitPrice: e.target.value })
                    }
                    className="input-field"
                    placeholder="15.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
                    Stock <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={form.stock}
                    onChange={(e) =>
                      setForm({ ...form, stock: e.target.value })
                    }
                    className="input-field"
                    placeholder="100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-venus-text-secondary mb-1.5">
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  value={form.lowStockThreshold}
                  onChange={(e) =>
                    setForm({ ...form, lowStockThreshold: e.target.value })
                  }
                  className="input-field"
                  placeholder="10"
                />
                <p className="mt-1 text-xs text-venus-text-muted">
                  Flags as "Low" in the table once stock falls to or below this
                  number.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-venus-border text-venus-text-primary rounded-lg text-sm font-medium hover:bg-venus-bg-elevated transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-venus-primary-500 hover:bg-venus-primary-600 text-white rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {editingId ? "Save Changes" : "Add Medication"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicationCatalog;
