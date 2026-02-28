import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createPortal } from "react-dom";
import { useCreateReminder } from "../hooks/useReminders";
import { BellRing } from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const schema = z.object({
  text: z.string().min(1, "Title required"),
  description: z.string().max(500).optional(),
  recurrence: z.enum(["once", "daily", "weekly"]),
  remind_at: z.string().optional(),
  weekdays: z.array(z.number()).optional(),
});
type FormInput = z.infer<typeof schema>;

interface Props { onClose: () => void; }

export function AddReminderModal({ onClose }: Props) {
  const create = useCreateReminder();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormInput>({
    resolver: zodResolver(schema) as any,
    defaultValues: { recurrence: "daily", weekdays: [], description: "", remind_at: "" },
  });
  const recurrence = watch("recurrence");
  const weekdays = watch("weekdays") ?? [];

  const toggleDay = (d: number) => {
    setValue("weekdays", weekdays.includes(d) ? weekdays.filter((x) => x !== d) : [...weekdays, d]);
  };

  const onSubmit = async (data: FormInput) => {
    await create.mutateAsync({
      text: data.text,
      description: data.description || null,
      recurrence: data.recurrence,
      remind_at: data.remind_at || null,
      weekdays: data.weekdays ?? null,
    });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="card w-full max-w-sm p-6 animate-float-in max-h-[90vh] overflow-y-auto shadow-xl">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-5 flex items-center gap-2">
          <BellRing className="w-5 h-5 text-zinc-800 dark:text-zinc-200" />
          New Reminder
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Title</label>
            <input {...register("text")} placeholder="Reminder text" className="input-field" />
            {errors.text && <p className="text-xs text-red-500 mt-1">{errors.text.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Description</label>
            <textarea {...register("description")} placeholder="Optional notes…" className="input-field resize-none h-20" maxLength={500} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Notify at</label>
            <input {...register("remind_at")} type="time" className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Repeat</label>
            <div className="flex gap-2">
              {(["once", "daily", "weekly"] as const).map((t) => (
                <label key={t} className={`flex-1 text-center py-1.5 rounded-xl text-xs font-semibold cursor-pointer border transition-all ${recurrence === t ? "bg-violet-600 text-white border-violet-600" : "bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800"}`}>
                  <input {...register("recurrence")} type="radio" value={t} className="sr-only" />
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </label>
              ))}
            </div>
          </div>
          {recurrence === "weekly" && (
            <div className="flex gap-1.5 flex-wrap">
              {DAYS.map((d, i) => (
                <button key={d} type="button" onClick={() => toggleDay(i)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  weekdays.includes(i)
                    ? "bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900 shadow-sm"
                    : "bg-transparent border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}>
                  {d}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={create.isPending} className="btn-primary flex-1" style={{ borderRadius: "0.875rem" }}>
              {create.isPending ? "Saving…" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
