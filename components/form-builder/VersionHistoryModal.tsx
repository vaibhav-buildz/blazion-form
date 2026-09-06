"use client"

import React, { useState } from "react"
import { History, RotateCcw, ArrowRight, CheckCircle2, FileText, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatDateTimeDDMMYYYY } from "@/lib/utils"

export interface FormVersion {
  id: string
  versionNumber: number
  publishedAt: string
  questions: any[]
  title: string
  description?: string
  settings?: any
}

interface VersionHistoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  versions: FormVersion[]
  currentQuestions: any[]
  onRollback: (version: FormVersion) => void
}

export function VersionHistoryModal({
  open,
  onOpenChange,
  versions = [],
  currentQuestions = [],
  onRollback,
}: VersionHistoryModalProps) {
  const [selectedVersion, setSelectedVersion] = useState<FormVersion | null>(
    versions[versions.length - 1] || null
  )

  React.useEffect(() => {
    if (versions.length > 0 && !selectedVersion) {
      setSelectedVersion(versions[versions.length - 1])
    }
  }, [versions])

  // Compute diff between currentQuestions and selectedVersion.questions
  const computeDiff = (v: FormVersion | null) => {
    if (!v) return { added: [], removed: [], unchanged: [] }
    const currentMap = new Map(currentQuestions.map((q) => [q.id, q]))
    const versionMap = new Map(v.questions.map((q: any) => [q.id, q]))

    const added: any[] = []
    const removed: any[] = []
    const unchanged: any[] = []

    currentQuestions.forEach((q) => {
      if (!versionMap.has(q.id)) {
        added.push(q) // in current but not in version
      } else {
        unchanged.push(q)
      }
    })

    v.questions.forEach((q: any) => {
      if (!currentMap.has(q.id)) {
        removed.push(q) // in version but not in current
      }
    })

    return { added, removed, unchanged }
  }

  const diff = computeDiff(selectedVersion)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <History className="w-5 h-5" />
            </div>
            <DialogTitle className="text-xl font-bold">Version History & Rollback</DialogTitle>
          </div>
        </DialogHeader>

        {versions.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-2">
            <History className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-semibold text-sm">No version snapshots saved yet.</p>
            <p className="text-xs">
              Every time you publish your form, a snapshot is automatically archived here for safe rollback.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {/* Version List */}
            <div className="md:col-span-1 space-y-2 border-r border-slate-200 dark:border-slate-800 pr-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Published Snapshots ({versions.length})
              </label>
              <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                {[...versions].reverse().map((v) => {
                  const isSelected = selectedVersion?.id === v.id
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVersion(v)}
                      className={`w-full text-left p-3 rounded-xl border transition ${
                        isSelected
                          ? "border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200"
                          : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">Version {v.versionNumber}</span>
                        <span className="text-[10px] text-slate-400">
                          {v.questions?.length || 0} fields
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {formatDateTimeDDMMYYYY(new Date(v.publishedAt))}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Version Detail & Diff */}
            <div className="md:col-span-2 space-y-4">
              {selectedVersion ? (
                <>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Version {selectedVersion.versionNumber} Snapshot
                      </h4>
                      <p className="text-xs text-slate-500">
                        Saved {formatDateTimeDDMMYYYY(new Date(selectedVersion.publishedAt))}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          confirm(
                            `Are you sure you want to rollback to Version ${selectedVersion.versionNumber}? Any unsaved changes in current draft will be overwritten.`
                          )
                        ) {
                          onRollback(selectedVersion)
                          onOpenChange(false)
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Rollback to v{selectedVersion.versionNumber}
                    </button>
                  </div>

                  {/* Diff breakdown */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Changes compared to current draft:
                    </label>

                    {diff.added.length === 0 && diff.removed.length === 0 ? (
                      <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-300">
                        Identical structure to current draft.
                      </div>
                    ) : (
                      <div className="space-y-2 text-xs">
                        {diff.removed.map((q: any) => (
                          <div
                            key={q.id}
                            className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/40"
                          >
                            <span className="font-bold">+ Exists in v{selectedVersion.versionNumber}</span> (removed in current draft): {q.title || "Untitled"} ({q.type})
                          </div>
                        ))}
                        {diff.added.map((q: any) => (
                          <div
                            key={q.id}
                            className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40"
                          >
                            <span className="font-bold">+ Added in current draft</span> (not in v{selectedVersion.versionNumber}): {q.title || "Untitled"} ({q.type})
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Question snapshot list */}
                    <div className="pt-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        Questions in v{selectedVersion.versionNumber} ({selectedVersion.questions?.length || 0}):
                      </label>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {selectedVersion.questions?.map((q: any, idx: number) => (
                          <div
                            key={q.id || idx}
                            className="flex items-center justify-between p-2 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                          >
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {idx + 1}. {q.title || "Untitled Question"}
                            </span>
                            <span className="text-[10px] uppercase font-semibold text-slate-400">
                              {q.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
