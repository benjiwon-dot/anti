import React from 'react';
import { Check } from 'lucide-react';

export default function ProgressBar({ currentStep }) {
    // Steps: 1: Select & Edit, 2: Summary & Login, 3: Payment
    const steps = [
        { id: 1, label: "Select & Edit" },
        { id: 2, label: "Summary & Login" },
        { id: 3, label: "Payment" }
    ];

    return (
        <div style={styles.container}>
            <div style={styles.track}>
                {steps.map((step, index) => {
                    const isActive = step.id === currentStep;
                    const isCompleted = step.id < currentStep;
                    const isLast = index === steps.length - 1;

                    return (
                        <div key={step.id} style={styles.stepWrapper}>
                            <div style={styles.labelContainer}>
                                <div
                                    style={{
                                        ...styles.indicator,
                                        backgroundColor: isActive || isCompleted ? '#111' : '#E5E7EB',
                                        borderColor: isActive || isCompleted ? '#111' : '#E5E7EB',
                                    }}
                                >
                                    {isCompleted ? (
                                        <Check size={10} color="#fff" strokeWidth={4} />
                                    ) : (
                                        <div style={{
                                            ...styles.dot,
                                            backgroundColor: isActive ? '#fff' : 'transparent'
                                        }} />
                                    )}
                                </div>
                                <span style={{
                                    ...styles.label,
                                    color: isActive ? '#111' : '#9CA3AF',
                                    fontWeight: isActive ? '700' : '500'
                                }}>
                                    {step.label}
                                </span>
                            </div>

                            {!isLast && (
                                <div style={styles.lineTrack}>
                                    <div style={{
                                        ...styles.lineFill,
                                        width: isCompleted ? '100%' : '0%'
                                    }} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const styles = {
    container: {
        width: '100%',
        padding: '16px 24px',
        backgroundColor: '#fff',
        borderBottom: '1px solid #F3F4F6',
    },
    track: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: '400px',
        margin: '0 auto',
        position: 'relative',
    },
    stepWrapper: {
        display: 'flex',
        alignItems: 'center',
        flex: 1,
    },
    labelContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        position: 'relative',
        zIndex: 2,
        backgroundColor: '#fff', // Mask line
        paddingRight: '8px',
    },
    indicator: {
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s ease',
    },
    dot: {
        width: '6px',
        height: '6px',
        borderRadius: '50%',
    },
    label: {
        fontSize: '12px',
        whiteSpace: 'nowrap',
    },
    lineTrack: {
        flex: 1,
        height: '2px',
        backgroundColor: '#E5E7EB',
        margin: '0 4px',
        position: 'relative',
        zIndex: 1,
    },
    lineFill: {
        height: '100%',
        backgroundColor: '#111',
        transition: 'width 0.3s ease',
    }
};
