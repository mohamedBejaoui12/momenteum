import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createPortal } from "react-dom";
import { useUpdateCounter } from "../hooks/useCounters";
import { Settings2, Smile, Trash2 } from "lucide-react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import type { Counter } from "../lib/types";

const schema = z.object({
  name: z.string().min(1, "Name required").max(50),
  icon: z.string().optional(),
  target_type: z.enum(["daily", "weekly"]),
  target_value: z.coerce.number().int().min(1),
});
type FormInput = z.infer<typeof schema>;

interface Props { 
  counter: Counter;
  onClose: () => void; 
  onDelete?: () => void;
}

export function EditCounterModal({ counter, onClose, onDelete }: Props) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const updateCounter = useUpdateCounter();
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { 
      name: counter.name,
      icon: counter.icon || "🎯", 
      target_type: counter.target_type as "daily" | "weekly", 
      target_value: counter.target_value 
    },
  });

  const selectedIcon = watch("icon");

  const onSubmit = async (data: FormInput) => {
    await updateCounter.mutateAsync({ 
      id: counter.id,
      ...data, 
      icon: data.icon || null 
    } as any);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="card w-full max-w-sm p-6 animate-float-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Edit Habit
          </h2>
          {onDelete && (
            <button 
              type="button" 
              onClick={onDelete}
              className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors"
              aria-label="Delete habit"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Name</label>
            <input {...register("name")} placeholder="e.g. No junk food" className="input-field" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div className="relative">
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Icon</label>
            <button
              type="button"
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              className="w-full flex items-center justify-between input-field hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <span className="text-xl">{selectedIcon || "🎯"}</span>
              <Smile className="w-5 h-5 text-zinc-400" />
            </button>
            {showEmojiPicker && (
              <div className="absolute top-full mt-2 left-0 z-50 shadow-xl rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
                <EmojiPicker
                  theme={Theme.AUTO}
                  onEmojiClick={(emoji) => {
                    setValue("icon", emoji.emoji);
                    setShowEmojiPicker(false);
                  }}
                  width={300}
                  height={350}
                  searchDisabled={false}
                  skinTonesDisabled
                  previewConfig={{ showPreview: false }}
                />
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Target Type</label>
              <select {...register("target_type")} className="input-field">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Target Goal</label>
              <input type="number" {...register("target_value")} className="input-field" min="1" />
            </div>
          </div>
          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={updateCounter.isPending} className="btn-primary flex-1" style={{ borderRadius: "0.875rem" }}>
              {updateCounter.isPending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
