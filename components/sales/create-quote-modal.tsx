"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Plus, Trash2, Send, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { calculateCommission } from "@/lib/sales/demo-data"

interface LineItem {
  description: string
  quantity: number
  unitPrice: number
}

interface CreateQuoteModalProps {
  isOpen: boolean
  onClose: () => void
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount)
}

export function CreateQuoteModal({ isOpen, onClose }: CreateQuoteModalProps) {
  const [clientName, setClientName] = useState("")
  const [clientEmail, setClientEmail] = useState("")
  const [title, setTitle] = useState("")
  const [items, setItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unitPrice: 0 },
  ])

  const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const commission = calculateCommission(total)

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unitPrice: 0 }])
  }

  const removeItem = (index: number) => {
    if (items.length === 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto"
          >
            <div className="bg-gray-900 border border-white/10 rounded-2xl shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-white/10">
                <h2 className="text-lg font-bold text-white">Create Quote</h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Form */}
              <div className="p-5 space-y-5">
                {/* Quote title */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Quote Title
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. AI Strategy Consultation"
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                  />
                </div>

                {/* Client details */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">
                      Client Name
                    </label>
                    <Input
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Marcus Chen"
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">
                      Client Email
                    </label>
                    <Input
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="marcus@example.com"
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                    />
                  </div>
                </div>

                {/* Line items */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-400">
                      Line Items
                    </label>
                    <button
                      onClick={addItem}
                      className="flex items-center gap-1 text-xs text-[#ff6a1a] hover:text-[#ea580c] transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Add Item
                    </button>
                  </div>

                  <div className="space-y-2">
                    {items.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          value={item.description}
                          onChange={(e) =>
                            updateItem(i, "description", e.target.value)
                          }
                          placeholder="Description"
                          className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-gray-600 text-sm"
                        />
                        <Input
                          type="number"
                          value={item.quantity || ""}
                          onChange={(e) =>
                            updateItem(i, "quantity", parseInt(e.target.value) || 0)
                          }
                          placeholder="Qty"
                          className="w-16 bg-white/5 border-white/10 text-white text-sm text-center"
                        />
                        <Input
                          type="number"
                          value={item.unitPrice || ""}
                          onChange={(e) =>
                            updateItem(i, "unitPrice", parseFloat(e.target.value) || 0)
                          }
                          placeholder="Price"
                          className="w-24 bg-white/5 border-white/10 text-white text-sm"
                        />
                        <button
                          onClick={() => removeItem(i)}
                          className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                          disabled={items.length === 1}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Total</span>
                    <span className="text-lg font-bold text-white">
                      {formatCurrency(total)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">
                      Your Commission (85%)
                    </span>
                    <span className="text-lg font-bold text-emerald-400">
                      {formatCurrency(commission.partnerShare)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-5 border-t border-white/10">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="border-white/20 text-gray-300"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Draft
                </Button>
                <Button className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white">
                  <Send className="w-4 h-4 mr-2" />
                  Send Quote
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
