import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

export type AttachmentStatus = 'valid' | 'invalid' | 'uploading' | 'uploaded' | 'upload_error';

export interface Attachment {
    id: string;         // local uuid
    file: File;
    filename: string;
    status: AttachmentStatus;
    file_id?: string;   // returned from server
    progress: number;   // 0-100
    errorMsg?: string;
}

const ALLOWED_EXTS = ['.pdf', '.docx'];

function getExt(name: string): string {
    const parts = name.split('.');
    return parts.length > 1 ? '.' + parts[parts.length - 1].toLowerCase() : '';
}

function isAllowed(name: string): boolean {
    return ALLOWED_EXTS.includes(getExt(name));
}

interface UseAttachmentsOptions {
    sessionId: string | null;
    apiBase?: string;
}

export function useAttachments({ sessionId, apiBase = 'http://localhost:4000' }: UseAttachmentsOptions) {
    const [attachments, setAttachments] = useState<Attachment[]>([]);

    const updateAttachment = useCallback((id: string, patch: Partial<Attachment>) => {
        setAttachments(prev => prev.map(a => (a.id === id ? { ...a, ...patch } : a)));
    }, []);

    const addFiles = useCallback(
        async (fileList: FileList) => {
            const incoming = Array.from(fileList);
            const newAttachments: Attachment[] = incoming.map(file => ({
                id: uuidv4(),
                file,
                filename: file.name,
                status: isAllowed(file.name) ? 'uploading' : 'invalid',
                progress: 0,
            }));

            setAttachments(prev => [...prev, ...newAttachments]);

            // Upload valid files
            for (const att of newAttachments) {
                if (att.status !== 'uploading') continue;

                const formData = new FormData();
                formData.append('file', att.file);
                formData.append('session_id', sessionId || 'default');

                try {
                    // Simulate progress via XHR so we can track it
                    await new Promise<void>((resolve, reject) => {
                        const xhr = new XMLHttpRequest();
                        xhr.open('POST', `${apiBase}/api/files`);

                        xhr.upload.onprogress = (e) => {
                            if (e.lengthComputable) {
                                const pct = Math.round((e.loaded / e.total) * 100);
                                updateAttachment(att.id, { progress: pct });
                            }
                        };

                        xhr.onload = () => {
                            if (xhr.status >= 200 && xhr.status < 300) {
                                try {
                                    const data = JSON.parse(xhr.responseText);
                                    updateAttachment(att.id, {
                                        status: 'uploaded',
                                        file_id: data.file_id,
                                        progress: 100,
                                    });
                                    resolve();
                                } catch {
                                    updateAttachment(att.id, { status: 'upload_error', errorMsg: 'Invalid server response' });
                                    reject();
                                }
                            } else {
                                updateAttachment(att.id, { status: 'upload_error', errorMsg: `Server error ${xhr.status}` });
                                reject();
                            }
                        };

                        xhr.onerror = () => {
                            updateAttachment(att.id, { status: 'upload_error', errorMsg: 'Network error' });
                            reject();
                        };

                        xhr.send(formData);
                    });
                } catch {
                    // already handled in xhr callbacks
                }
            }
        },
        [sessionId, apiBase, updateAttachment]
    );

    const removeAttachment = useCallback((id: string) => {
        setAttachments(prev => prev.filter(a => a.id !== id));
    }, []);

    const clearAttachments = useCallback(() => {
        setAttachments([]);
    }, []);

    const hasInvalid = attachments.some(a => a.status === 'invalid' || a.status === 'upload_error');
    const isUploading = attachments.some(a => a.status === 'uploading');
    const uploadedFileIds = attachments
        .filter(a => a.status === 'uploaded' && a.file_id)
        .map(a => a.file_id as string);

    return { attachments, addFiles, removeAttachment, clearAttachments, hasInvalid, isUploading, uploadedFileIds };
}
