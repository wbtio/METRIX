'use client';

import * as Dialog from '@radix-ui/react-dialog';

import { Button } from '@/components/ui/button';

interface MatrixManifestoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MatrixManifestoDialog({
  open,
  onOpenChange,
}: MatrixManifestoDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        <Dialog.Content
          dir="rtl"
          className="scrollbar-thin fixed left-1/2 top-1/2 z-50 w-[min(calc(100vw-1.5rem),36rem)] max-h-[calc(100dvh-1.5rem)] -translate-x-1/2 -translate-y-1/2 overflow-x-hidden overflow-y-auto rounded-[2rem] border border-black/10 bg-white text-right shadow-[0_32px_90px_rgba(15,23,42,0.18)] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-black/15 to-transparent" />

          <div className="space-y-6 p-5 sm:p-7">
            <div className="space-y-3">
              <div className="inline-flex rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-[0.72rem] font-semibold text-black/65">
                البيان التأسيسي
              </div>

              <Dialog.Title className="text-2xl font-bold leading-tight text-slate-950 sm:text-[2rem]">
                لماذا صممت ماتريكس؟
              </Dialog.Title>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
              <Dialog.Description className="text-sm leading-8 text-slate-700 sm:text-[0.98rem]">
                &quot;أنا لا أبحث عن مجرد &apos;النجاح&apos;. لدي هدف ضخم يحدد
                وجودي، هدفٌ إن متُّ قبل تحقيقه فلن أكون راضياً عن نفسي أبداً،
                لدرجة أنني لو مُنحت الجنة دونه لاخترت الجحيم. ماتريكس ليس قائمة
                مهام عادية (To-Do List) لتدوين يومياتك، إنه &apos;نظام تتبع
                صارم&apos;. صممته لنفسي لأراقب هدفي بلا رحمة، ولأعرف بالضبط ماذا
                أنجزت كل يوم بالبيانات والأرقام. هنا، لا مجال للأعذار
                والتسويف.&quot;
              </Dialog.Description>
            </div>

            <Dialog.Close asChild>
              <Button className="h-12 w-full rounded-2xl bg-slate-950 text-base font-semibold text-white shadow-[0_18px_40px_rgba(15,23,42,0.16)] transition hover:bg-slate-900 sm:h-14">
                أنا مستعد
              </Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
