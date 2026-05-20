import React from 'react';
import { Box, Typography, LinearProgress, Tooltip } from '@mui/material';
import { Warning as WarningIcon, Close as CloseIcon } from '@mui/icons-material';
import type { Attachment } from './useAttachments';

const MAX_FILENAME_LEN = 22;

function truncate(name: string, max: number): string {
    if (name.length <= max) return name;
    const ext = name.includes('.') ? '.' + name.split('.').pop() : '';
    const base = name.slice(0, max - ext.length - 3);
    return `${base}...${ext}`;
}

interface Props {
    attachments: Attachment[];
    onRemove: (id: string) => void;
    hasInvalid: boolean;
}

export const AttachmentTray: React.FC<Props> = ({ attachments, onRemove, hasInvalid }) => {
    if (attachments.length === 0) return null;

    return (
        <Box sx={{ px: 2, pb: 0, pt: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {/* Validation tooltip */}
            {hasInvalid && (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        bgcolor: 'rgba(251, 191, 36, 0.15)',
                        border: '1px solid rgba(251, 191, 36, 0.4)',
                        borderRadius: '8px',
                        px: 1.5,
                        py: 0.5,
                    }}
                >
                    <WarningIcon sx={{ fontSize: 14, color: '#fbbf24' }} />
                    <Typography sx={{ fontSize: '0.72rem', color: '#fbbf24', lineHeight: 1.4 }}>
                        Attachment only supports .pdf and .docx files
                    </Typography>
                </Box>
            )}

            {/* Chips row */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {attachments.map(att => {
                    const isInvalid = att.status === 'invalid' || att.status === 'upload_error';
                    const isUploading = att.status === 'uploading';

                    return (
                        <Tooltip
                            key={att.id}
                            title={att.errorMsg || att.filename}
                            placement="top"
                            arrow
                        >
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'stretch',
                                    gap: 0.5,
                                    px: 1,
                                    py: 0.4,
                                    borderRadius: '999px',
                                    bgcolor: isInvalid
                                        ? 'rgba(239, 68, 68, 0.1)'
                                        : 'rgba(255, 255, 255, 0.1)',
                                    border: isInvalid
                                        ? '1.5px solid rgba(239, 68, 68, 0.7)'
                                        : '1px solid rgba(255, 255, 255, 0.25)',
                                    backdropFilter: 'blur(8px)',
                                    maxWidth: 180,
                                    minWidth: 80,
                                    cursor: 'default',
                                    transition: 'all 0.15s',
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    {isInvalid && (
                                        <WarningIcon sx={{ fontSize: 12, color: '#ef4444', flexShrink: 0 }} />
                                    )}
                                    <Typography
                                        sx={{
                                            fontSize: '0.72rem',
                                            color: isInvalid ? '#ef4444' : 'rgba(255,255,255,0.9)',
                                            flex: 1,
                                            overflow: 'hidden',
                                            whiteSpace: 'nowrap',
                                            textOverflow: 'ellipsis',
                                        }}
                                    >
                                        {truncate(att.filename, MAX_FILENAME_LEN)}
                                    </Typography>

                                    {/* Remove button */}
                                    <Box
                                        component="button"
                                        onClick={() => onRemove(att.id)}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            p: 0,
                                            ml: 0.25,
                                            color: isInvalid ? 'rgba(239,68,68,0.7)' : 'rgba(255,255,255,0.5)',
                                            '&:hover': { color: isInvalid ? '#ef4444' : 'white' },
                                            flexShrink: 0,
                                        }}
                                    >
                                        <CloseIcon sx={{ fontSize: 12 }} />
                                    </Box>
                                </Box>

                                {/* Progress bar for uploading state */}
                                {isUploading && (
                                    <LinearProgress
                                        variant="determinate"
                                        value={att.progress}
                                        sx={{
                                            mt: 0.4,
                                            height: 2,
                                            borderRadius: 1,
                                            bgcolor: 'rgba(255,255,255,0.1)',
                                            '& .MuiLinearProgress-bar': {
                                                bgcolor: '#60a5fa',
                                                borderRadius: 1,
                                            },
                                        }}
                                    />
                                )}
                            </Box>
                        </Tooltip>
                    );
                })}
            </Box>
        </Box>
    );
};
