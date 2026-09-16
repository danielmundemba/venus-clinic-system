import { useState, useEffect, useCallback } from 'react';
import { useMedicalRecords } from '../../hooks/useMedicalRecords';
import { useFirestore } from '../../hooks/useFirestore';
import { Plus, Trash2, CreditCard, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

// Predefined medical services catalog
const DEFAULT_SERVICES = [
  { code: 'CONSULT', name: 'Consultation', price: 150 },
  { code: 'FOLLOWUP', name: 'Follow-up Visit', price: 100 },
  { code: 'EMERGENCY', name: 'Emergency Consultation', price: 300 },
  { code: 'FBC', name: 'Full Blood Count', price: 80 },
  { code: 'URINALYSIS', name: 'Urinalysis', price: 45 },
  { code: 'BLOOD_CHEM', name: 'Blood Chemistry', price: 120 },
  { code: 'XRAY_CHEST', name: 'Chest X-Ray', price: 200 },
  { code: 'XRAY_LIMB', name: 'Limb X-Ray', price: 180 },
  { code: 'ULTRASOUND', name: 'Ultrasound', price: 350 },
  { code: 'ECG', name: 'ECG', price: 100 },
  { code: 'INJECTION', name: 'Injection', price: 25 },
  { code: 'DRESSING', name: 'Wound Dressing', price: 40 },
  { code: 'SUTURING', name: 'Suturing', price: 150 },
  { code: 'IV_THERAPY', name: 'IV Therapy', price: 80 },
  { code: 'PHYSIO', name: 'Physiotherapy Session', price: 120 },
];

const BillingServicesForm = ({ patientId, recordId, billing, onUpdate }) => {
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const { addBillingService, removeBillingService, loading } = useMedicalRecords(patientId);
  const { getAll: getServices } = useFirestore('services');

  const loadServices = useCallback(async () => {
    try {
      const data = await getServices();
      if (data.length > 0) {
        setServices(data.map(s => ({ 
          code: s.code || s.id, 
          name: s.name, 
          price: Number(s.price) 
        })));
      } else {
        setServices(DEFAULT_SERVICES);
      }
    } catch (err) {
      console.error('Failed to load services:', err);
      setServices(DEFAULT_SERVICES);
    }
  }, [getServices]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadServices();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadServices]);

  const handleAddService = async () => {
    setSubmitError('');
    setSubmitSuccess('');
    try {
      if (showCustom) {
        if (!customName || !customPrice) return;
        await addBillingService(recordId, {
          serviceName: customName,
          serviceCode: 'CUSTOM',
          quantity: Number(quantity),
          unitPrice: Number(customPrice),
          totalAmount: Number(quantity) * Number(customPrice)
        });
        setCustomName('');
        setCustomPrice('');
        setQuantity(1);
        setSubmitSuccess('Custom service added successfully!');
      } else {
        if (!selectedService) return;
        const service = services.find(s => s.code === selectedService);
        if (!service) return;
        await addBillingService(recordId, {
          serviceName: service.name,
          serviceCode: service.code,
          quantity: Number(quantity),
          unitPrice: service.price,
          totalAmount: Number(quantity) * service.price
        });
        setSelectedService('');
        setQuantity(1);
        setSubmitSuccess('Service added successfully!');
      }
      onUpdate?.();
    } catch (err) {
      console.error('Failed to add billing service:', err);
      setSubmitError(err.message || 'Failed to add service. Please try again.');
    }
  };

  const handleRemove = async (billId) => {
    setSubmitError('');
    setSubmitSuccess('');
    try {
      await removeBillingService(recordId, billId);
      setSubmitSuccess('Service removed successfully!');
      onUpdate?.();
    } catch (err) {
      console.error('Failed to remove billing service:', err);
      setSubmitError(err.message || 'Failed to remove service. Please try again.');
    }
  };

  // Auto-dismiss success message
  useEffect(() => {
    if (submitSuccess) {
      const timer = setTimeout(() => setSubmitSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [submitSuccess]);

  const totalBill = billing.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
  const pendingAmount = billing
    .filter(item => item.status === 'pending')
    .reduce((sum, item) => sum + (item.totalAmount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-venus-text-primary flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-venus-primary-400" />
          Billing Services
        </h3>
        <div className="text-right">
          <p className="text-xs text-venus-text-muted">Total Bill</p>
          <p className="text-xl font-bold text-venus-text-primary">K {totalBill.toFixed(2)}</p>
        </div>
      </div>

      {/* Success message */}
      {submitSuccess && (
        <div className="flex items-center gap-2 p-3 bg-venus-success/10 border border-venus-success/30 rounded-lg text-venus-success">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{submitSuccess}</span>
        </div>
      )}

      {/* Error message */}
      {submitError && (
        <div className="flex items-start gap-2 p-3 bg-venus-danger/10 border border-venus-danger/30 rounded-lg text-venus-danger">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Failed to save</p>
            <p className="text-xs">{submitError}</p>
          </div>
        </div>
      )}

      {/* Add Service Form */}
      <div className="card bg-venus-bg-tertiary/50">
        <h4 className="text-sm font-semibold text-venus-text-primary mb-4">Add Service</h4>

        <div className="flex items-center gap-2 mb-3">
          <button
            type="button"
            onClick={() => setShowCustom(false)}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              !showCustom 
                ? 'bg-venus-primary-500 text-white' 
                : 'bg-venus-bg-secondary text-venus-text-secondary hover:text-venus-text-primary'
            }`}
          >
            Catalog
          </button>
          <button
            type="button"
            onClick={() => setShowCustom(true)}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              showCustom 
                ? 'bg-venus-primary-500 text-white' 
                : 'bg-venus-bg-secondary text-venus-text-secondary hover:text-venus-text-primary'
            }`}
          >
            Custom
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {showCustom ? (
            <>
              <div className="md:col-span-2">
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Service name"
                  className="input-field"
                />
              </div>
              <div>
                <input
                  type="number"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  placeholder="Price (K)"
                  className="input-field"
                  min="0"
                  step="0.01"
                />
              </div>
            </>
          ) : (
            <div className="md:col-span-3">
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="input-field"
              >
                <option value="">Select a service...</option>
                {services.map((service) => (
                  <option key={service.code} value={service.code}>
                    {service.name} — K {service.price.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              placeholder="Qty"
              className="input-field w-20"
              min="1"
            />
            <button
              type="button"
              onClick={handleAddService}
              disabled={loading || (!showCustom && !selectedService) || (showCustom && (!customName || !customPrice))}
              className="flex items-center gap-1.5 px-4 py-2 bg-venus-primary-500 text-white rounded-lg hover:bg-venus-primary-600 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Bill Items Table */}
      <div className="border border-venus-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-venus-bg-tertiary">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-venus-text-muted uppercase">Service</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-venus-text-muted uppercase">Qty</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-venus-text-muted uppercase">Unit Price</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-venus-text-muted uppercase">Total</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-venus-text-muted uppercase">Status</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-venus-text-muted uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-venus-border">
            {billing.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-sm text-venus-text-muted">
                  No services added yet
                </td>
              </tr>
            ) : (
              billing.map((item) => (
                <tr key={item.id} className="hover:bg-venus-bg-tertiary/50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-venus-text-primary">{item.serviceName}</p>
                      <p className="text-xs text-venus-text-muted">{item.serviceCode}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-venus-text-primary">{item.quantity}</td>
                  <td className="px-4 py-3 text-right text-sm text-venus-text-primary">K {item.unitPrice?.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-venus-text-primary">K {item.totalAmount?.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      item.status === 'paid' 
                        ? 'bg-green-500/10 text-green-400' 
                        : 'bg-yellow-500/10 text-yellow-400'
                    }`}>
                      {item.status === 'paid' ? <CheckCircle2 className="w-3 h-3" /> : null}
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleRemove(item.id)}
                        className="p-1.5 text-venus-danger hover:bg-venus-danger/10 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-venus-bg-tertiary border-t border-venus-border">
            <tr>
              <td colSpan="3" className="px-4 py-3 text-right text-sm font-medium text-venus-text-secondary">
                Total Amount:
              </td>
              <td className="px-4 py-3 text-right text-lg font-bold text-venus-primary-400">
                K {totalBill.toFixed(2)}
              </td>
              <td colSpan="2"></td>
            </tr>
            {pendingAmount > 0 && (
              <tr>
                <td colSpan="3" className="px-4 py-2 text-right text-xs text-venus-text-muted">
                  Pending:
                </td>
                <td className="px-4 py-2 text-right text-sm text-yellow-400">
                  K {pendingAmount.toFixed(2)}
                </td>
                <td colSpan="2"></td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      {/* Billing Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-xs text-venus-text-muted uppercase">Total Services</p>
          <p className="text-2xl font-bold text-venus-text-primary">{billing.length}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-venus-text-muted uppercase">Paid</p>
          <p className="text-2xl font-bold text-green-400">
            K {(totalBill - pendingAmount).toFixed(2)}
          </p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-venus-text-muted uppercase">Pending</p>
          <p className="text-2xl font-bold text-yellow-400">
            K {pendingAmount.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BillingServicesForm;