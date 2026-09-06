"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Users,
  UserPlus,
  FolderPlus,
  Folder,
  Shield,
  ShieldCheck,
  Eye,
  Mail,
  Trash2,
  CheckCircle2,
  Loader2,
  Building2,
} from "lucide-react"

interface Member {
  id: string
  email: string
  role: "Admin" | "Editor" | "Viewer"
  status: "Active" | "Invited"
  invitedAt: string
}

interface SharedFolder {
  id: string
  name: string
  color: string
  formCount: number
}

const DEFAULT_MEMBERS: Member[] = [
  {
    id: "mem-owner",
    email: "owner@workspace.io",
    role: "Admin",
    status: "Active",
    invitedAt: "2026-08-01",
  },
]

const DEFAULT_FOLDERS: SharedFolder[] = [
  { id: "f-1", name: "Campus Admissions 2026", color: "bg-blue-500", formCount: 3 },
  { id: "f-2", name: "Hiring & Recruitment", color: "bg-emerald-500", formCount: 2 },
  { id: "f-3", name: "Customer Feedback & NPS", color: "bg-purple-500", formCount: 4 },
]

export function TeamWorkspaceModal() {
  const [open, setOpen] = React.useState(false)
  const [members, setMembers] = React.useState<Member[]>(DEFAULT_MEMBERS)
  const [folders, setFolders] = React.useState<SharedFolder[]>(DEFAULT_FOLDERS)

  // Invite state
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [inviteRole, setInviteRole] = React.useState<"Admin" | "Editor" | "Viewer">("Editor")
  const [isInviting, setIsInviting] = React.useState(false)
  const [inviteSuccess, setInviteSuccess] = React.useState<string | null>(null)
  const [inviteError, setInviteError] = React.useState<string | null>(null)

  // New folder state
  const [newFolderName, setNewFolderName] = React.useState("")

  React.useEffect(() => {
    try {
      const savedMembers = localStorage.getItem("blazion_workspace_members")
      if (savedMembers) setMembers(JSON.parse(savedMembers))

      const savedFolders = localStorage.getItem("blazion_workspace_folders")
      if (savedFolders) setFolders(JSON.parse(savedFolders))
    } catch {}
  }, [])

  const saveMembers = (updated: Member[]) => {
    setMembers(updated)
    try {
      localStorage.setItem("blazion_workspace_members", JSON.stringify(updated))
    } catch {}
  }

  const saveFolders = (updated: SharedFolder[]) => {
    setFolders(updated)
    try {
      localStorage.setItem("blazion_workspace_folders", JSON.stringify(updated))
    } catch {}
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setIsInviting(true)
    setInviteError(null)
    setInviteSuccess(null)

    try {
      const res = await fetch("/api/workspace/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to invite member")
      }

      const newMember: Member = data.member || {
        id: crypto.randomUUID(),
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        status: "Invited",
        invitedAt: new Date().toISOString(),
      }

      const updated = [...members, newMember]
      saveMembers(updated)
      setInviteSuccess(`Invitation sent to ${inviteEmail} as ${inviteRole}!`)
      setInviteEmail("")
    } catch (err: any) {
      setInviteError(err.message || "Failed to send invitation")
    } finally {
      setIsInviting(false)
    }
  }

  const handleRemoveMember = (id: string) => {
    const updated = members.filter((m) => m.id !== id)
    saveMembers(updated)
  }

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFolderName.trim()) return

    const colors = ["bg-indigo-500", "bg-pink-500", "bg-amber-500", "bg-cyan-500", "bg-teal-500"]
    const randomColor = colors[Math.floor(Math.random() * colors.length)]

    const newFolder: SharedFolder = {
      id: crypto.randomUUID(),
      name: newFolderName.trim(),
      color: randomColor,
      formCount: 0,
    }

    const updated = [...folders, newFolder]
    saveFolders(updated)
    setNewFolderName("")
  }

  const handleRemoveFolder = (id: string) => {
    const updated = folders.filter((f) => f.id !== id)
    saveFolders(updated)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 text-sm">
          <Users className="w-4 h-4 text-purple-600" />
          <span>Team Workspace</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Team Workspace</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Collaborate with team members across shared form folders with role-based permissions.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="members" className="space-y-4 pt-2">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="members" className="gap-2">
              <Users className="w-4 h-4" />
              <span>Members ({members.length})</span>
            </TabsTrigger>
            <TabsTrigger value="folders" className="gap-2">
              <Folder className="w-4 h-4" />
              <span>Shared Folders ({folders.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: MEMBERS */}
          <TabsContent value="members" className="space-y-4">
            {/* Invite Form */}
            <form onSubmit={handleInvite} className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-primary" />
                Invite New Teammate
              </h4>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <Input
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => {
                      setInviteEmail(e.target.value)
                      setInviteError(null)
                      setInviteSuccess(null)
                    }}
                    required
                    className="text-xs"
                  />
                </div>

                <div className="w-full sm:w-36">
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-hidden"
                  >
                    <option value="Admin">Admin (Full)</option>
                    <option value="Editor">Editor (Edit)</option>
                    <option value="Viewer">Viewer (Read-only)</option>
                  </select>
                </div>

                <Button type="submit" size="sm" disabled={isInviting} className="gap-1.5 font-semibold shrink-0">
                  {isInviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                  <span>Invite</span>
                </Button>
              </div>

              {inviteSuccess && (
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {inviteSuccess}
                </p>
              )}
              {inviteError && <p className="text-xs font-medium text-destructive">{inviteError}</p>}
            </form>

            {/* Members List */}
            <div className="border border-border rounded-xl overflow-hidden divide-y divide-border text-xs">
              {members.map((m) => {
                let roleColor = "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20"
                let RoleIcon = ShieldCheck
                if (m.role === "Editor") {
                  roleColor = "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20"
                  RoleIcon = Shield
                } else if (m.role === "Viewer") {
                  roleColor = "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20"
                  RoleIcon = Eye
                }

                return (
                  <div key={m.id} className="p-3.5 flex items-center justify-between gap-3 bg-card hover:bg-muted/30 transition">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                        {m.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{m.email}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Status: <span className="font-medium">{m.status}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-[11px] border ${roleColor}`}>
                        <RoleIcon className="w-3 h-3" />
                        {m.role}
                      </span>
                      {m.id !== "mem-owner" && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(m.id)}
                          className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                          title="Remove teammate"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </TabsContent>

          {/* TAB 2: SHARED FOLDERS */}
          <TabsContent value="folders" className="space-y-4">
            {/* Create Folder Form */}
            <form onSubmit={handleCreateFolder} className="flex gap-2">
              <Input
                placeholder="New folder name (e.g. Campus Drive 2026)"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                required
                className="text-xs"
              />
              <Button type="submit" size="sm" className="gap-1.5 font-semibold shrink-0">
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Create Folder</span>
              </Button>
            </form>

            {/* Folder Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {folders.map((f) => (
                <div
                  key={f.id}
                  className="p-4 rounded-xl border border-border bg-card flex items-center justify-between gap-3 shadow-2xs hover:border-primary/50 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${f.color}`} />
                    <div>
                      <h5 className="font-semibold text-foreground text-sm">{f.name}</h5>
                      <p className="text-[11px] text-muted-foreground">{f.formCount} shared forms</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFolder(f.id)}
                    className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition"
                    title="Delete folder"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
