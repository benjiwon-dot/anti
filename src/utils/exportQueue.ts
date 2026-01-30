/**
 * src/utils/exportQueue.ts
 * 
 * Simple sequential queue for processing exports in the background without blocking UI.
 */

type Task = () => Promise<void>;

class ExportQueue {
    private queue: Task[] = [];
    private isProcessing = false;
    private currentTaskName: string | null = null;

    enqueue(task: Task, name?: string) {
        // console.log(`[ExportQueue] Enqueued: ${name || 'task'}`);
        this.queue.push(task);
        this.process();
    }

    private async process() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        while (this.queue.length > 0) {
            const task = this.queue.shift();
            if (task) {
                try {
                    // console.log(`[ExportQueue] Processing started`);
                    await task();
                    // console.log(`[ExportQueue] Processing finished`);
                } catch (e) {
                    console.error("[ExportQueue] Task failed", e);
                }
            }
        }

        this.isProcessing = false;
        this.currentTaskName = null;
    }

    get pendingCount() {
        return this.queue.length;
    }

    get isBusy() {
        return this.isProcessing;
    }
}

export const exportQueue = new ExportQueue();
