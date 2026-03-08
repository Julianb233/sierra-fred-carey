"use client"

/**
 * Test Account Manager
 *
 * Phase 90: User Testing Loop
 * Admin UI for creating, listing, and deleting test accounts.
 */

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TestAccount {
  id: string
  email: string
  tier: string
  createdAt: string
  testGroup: string
  isActive: boolean
  fullName?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TestAccountManager() {
  const [accounts, setAccounts] = useState<TestAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [cleaningUp, setCleaningUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [formEmail, setFormEmail] = useState("")
  const [formTier, setFormTier] = useState("pro")
  const [formGroup, setFormGroup] = useState("qa")
  const [formName, setFormName] = useState("")

  // Confirmation dialog
  const [confirmCleanup, setConfirmCleanup] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/test-accounts")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setAccounts(data.accounts || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load accounts")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const clearMessages = () => {
    setError(null)
    setSuccess(null)
  }

  // ---------------------------------------------------------------------------
  // Create single account
  // ---------------------------------------------------------------------------

  const handleCreate = async () => {
    clearMessages()
    if (!formEmail) {
      setError("Email is required")
      return
    }

    setCreating(true)
    try {
      const res = await fetch("/api/admin/test-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formEmail,
          tier: formTier,
          testGroup: formGroup,
          fullName: formName || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create")

      setSuccess(`Created test account: ${formEmail}`)
      setFormEmail("")
      setFormName("")
      await fetchAccounts()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account")
    } finally {
      setCreating(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Create batch
  // ---------------------------------------------------------------------------

  const handleBatchCreate = async () => {
    clearMessages()
    setCreating(true)
    try {
      const res = await fetch("/api/admin/test-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batch: {
            count: 5,
            tier: formTier,
            testGroup: formGroup,
          },
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create batch")

      const count = data.created?.length || 0
      setSuccess(`Created ${count} test accounts`)
      await fetchAccounts()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Batch creation failed")
    } finally {
      setCreating(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Delete single
  // ---------------------------------------------------------------------------

  const handleDelete = async (userId: string) => {
    clearMessages()
    setDeleting(userId)
    setConfirmDeleteId(null)
    try {
      const res = await fetch("/api/admin/test-accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete")

      setSuccess("Test account deleted")
      await fetchAccounts()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account")
    } finally {
      setDeleting(null)
    }
  }

  // ---------------------------------------------------------------------------
  // Clean up all
  // ---------------------------------------------------------------------------

  const handleCleanUpAll = async () => {
    clearMessages()
    setCleaningUp(true)
    setConfirmCleanup(false)
    try {
      const res = await fetch("/api/admin/test-accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteAll: true }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Cleanup failed")

      setSuccess(data.message || "All test accounts deleted")
      await fetchAccounts()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cleanup failed")
    } finally {
      setCleaningUp(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const tierColor = (tier: string) => {
    switch (tier) {
      case "studio":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      case "pro":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    }
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4">
          <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
        </div>
      )}

      {/* Create Form */}
      <Card>
        <CardHeader>
          <CardTitle>Create Test Account</CardTitle>
          <CardDescription>
            Create individual test accounts or batch-create for QA testing.
            Default password: TestAccount2026!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="test@sahara-testing.local"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tier">Tier</Label>
              <Select value={formTier} onValueChange={setFormTier}>
                <SelectTrigger id="tier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="studio">Studio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="group">Test Group</Label>
              <Select value={formGroup} onValueChange={setFormGroup}>
                <SelectTrigger id="group">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="qa">QA</SelectItem>
                  <SelectItem value="mobile-qa">Mobile QA</SelectItem>
                  <SelectItem value="event-preview">Event Preview</SelectItem>
                  <SelectItem value="beta-tester">Beta Tester</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Full Name (optional)</Label>
              <Input
                id="name"
                placeholder="Test User"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button onClick={handleCreate} disabled={creating || !formEmail}>
              {creating ? "Creating..." : "Create Account"}
            </Button>
            <Button
              variant="outline"
              onClick={handleBatchCreate}
              disabled={creating}
            >
              {creating ? "Creating..." : "Create Batch (5)"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Test Accounts ({accounts.length})</CardTitle>
              <CardDescription>
                All test accounts tagged with is_test_account metadata
              </CardDescription>
            </div>
            <Dialog open={confirmCleanup} onOpenChange={setConfirmCleanup}>
              <DialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={cleaningUp || accounts.length === 0}
                >
                  {cleaningUp ? "Cleaning up..." : "Clean Up All"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete All Test Accounts?</DialogTitle>
                  <DialogDescription>
                    This will permanently delete {accounts.length} test
                    account(s) and their associated data. This action cannot be
                    undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setConfirmCleanup(false)}
                  >
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleCleanUpAll}>
                    Delete All
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
              No test accounts found. Create one above to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-mono text-sm">
                        {account.email}
                      </TableCell>
                      <TableCell>
                        <Badge className={tierColor(account.tier)} variant="secondary">
                          {account.tier}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{account.testGroup}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(account.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={account.isActive ? "default" : "secondary"}
                          className={
                            account.isActive
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : ""
                          }
                        >
                          {account.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog
                          open={confirmDeleteId === account.id}
                          onOpenChange={(open) =>
                            setConfirmDeleteId(open ? account.id : null)
                          }
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-950"
                              disabled={deleting === account.id}
                            >
                              {deleting === account.id
                                ? "Deleting..."
                                : "Delete"}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Delete Test Account?</DialogTitle>
                              <DialogDescription>
                                Delete {account.email}? This will remove the
                                user and all associated data.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setConfirmDeleteId(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => handleDelete(account.id)}
                              >
                                Delete
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
