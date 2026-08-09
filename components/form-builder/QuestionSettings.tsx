import * as React from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { X, Plus } from "lucide-react"
import { type Question } from "./QuestionCard"

interface QuestionSettingsProps {
  question: Question
  onUpdate: (id: string, updates: Partial<Question>) => void
}

export function QuestionSettings({ question, onUpdate }: QuestionSettingsProps) {
  const pendingUpdates = React.useRef<Partial<Question>>({})
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const handleUpdate = (updates: Partial<Question>) => {
    // Immediate UI update
    onUpdate(question.id, updates)
    
    // Accumulate for API
    pendingUpdates.current = { ...pendingUpdates.current, ...updates }
    
    // Debounce API call
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(async () => {
      const payload = { ...pendingUpdates.current }
      pendingUpdates.current = {}
      try {
        await fetch(`/api/questions/${question.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
      } catch (err) {
        console.error("Failed to update question", err)
      }
    }, 500)
  }

  const handleSettingUpdate = (key: string, value: any) => {
    const newSettings = { ...(question.settings || {}), [key]: value }
    handleUpdate({ settings: newSettings })
  }

  const handleOptionUpdate = (idx: number, val: string) => {
    const newOptions = [...(question.options || [])]
    newOptions[idx] = val
    handleUpdate({ options: newOptions })
  }

  const handleOptionRemove = (idx: number) => {
    const newOptions = [...(question.options || [])]
    if (newOptions.length > 1) {
      newOptions.splice(idx, 1)
      handleUpdate({ options: newOptions })
    }
  }

  const handleOptionAdd = () => {
    const newOptions = [...(question.options || [])]
    newOptions.push(`Option ${newOptions.length + 1}`)
    handleUpdate({ options: newOptions })
  }

  const isOptionsType = ["multiple_choice", "checkbox", "dropdown"].includes(question.type)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Editing Question</h3>
      </div>
      
      {/* Common Fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Question Title</Label>
          <Input 
            value={question.title} 
            onChange={(e) => handleUpdate({ title: e.target.value })} 
          />
        </div>
        
        <div className="space-y-2">
          <Label>Help Text (Optional)</Label>
          <Textarea 
            value={question.description || ""} 
            onChange={(e) => handleUpdate({ description: e.target.value })}
            placeholder="Add a description..."
            className="resize-none"
          />
        </div>

        <div className="flex items-center space-x-2 pt-2">
          <Checkbox 
            id="settings-required" 
            checked={question.required} 
            onCheckedChange={(checked) => handleUpdate({ required: !!checked })}
          />
          <Label htmlFor="settings-required">Required</Label>
        </div>
      </div>

      <div className="border-t border-border pt-6 space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Type Specific Settings</h4>
        
        {/* Text Types */}
        {(question.type === "short_text" || question.type === "long_text") && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Placeholder Text</Label>
              <Input 
                value={question.settings?.placeholder || ""} 
                onChange={(e) => handleSettingUpdate("placeholder", e.target.value)}
                placeholder={question.type === "long_text" ? "Long text response..." : "Short text response..."}
              />
            </div>
            
            {question.type === "short_text" && (
              <div className="space-y-2">
                <Label>Max Characters</Label>
                <Input 
                  type="number" 
                  value={question.settings?.maxChars || ""} 
                  onChange={(e) => handleSettingUpdate("maxChars", e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="No limit"
                />
              </div>
            )}
            
            {question.type === "long_text" && (
              <>
                <div className="space-y-2">
                  <Label>Min Word Count</Label>
                  <Input 
                    type="number" 
                    value={question.settings?.minWords || ""} 
                    onChange={(e) => handleSettingUpdate("minWords", e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="No limit"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Character Count</Label>
                  <Input 
                    type="number" 
                    value={question.settings?.maxChars || ""} 
                    onChange={(e) => handleSettingUpdate("maxChars", e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="No limit"
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Option Types */}
        {isOptionsType && (
          <div className="space-y-4">
            <div className="space-y-3">
              <Label>Options</Label>
              {question.options?.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input 
                    value={opt} 
                    onChange={(e) => handleOptionUpdate(idx, e.target.value)} 
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleOptionRemove(idx)}
                    disabled={(question.options?.length || 0) <= 1}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={handleOptionAdd} className="w-full mt-2">
                <Plus className="h-4 w-4 mr-2" /> Add option
              </Button>
            </div>
            
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox 
                id="settings-shuffle" 
                checked={question.settings?.shuffle || false} 
                onCheckedChange={(checked) => handleSettingUpdate("shuffle", !!checked)}
              />
              <Label htmlFor="settings-shuffle">Shuffle options</Label>
            </div>
            
            {question.type === "checkbox" && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label>Min selections</Label>
                  <Input 
                    type="number" 
                    value={question.settings?.minSelect || ""} 
                    onChange={(e) => handleSettingUpdate("minSelect", e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max selections</Label>
                  <Input 
                    type="number" 
                    value={question.settings?.maxSelect || ""} 
                    onChange={(e) => handleSettingUpdate("maxSelect", e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
