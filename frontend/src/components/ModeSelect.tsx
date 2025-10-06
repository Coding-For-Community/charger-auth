import { Button, rem, Select, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import type { ModeOption } from '../api/checkIn';

export const ModeSelectComponent = Select.withProps({
    data: [
        { value: 'free_period', label: 'Free period check in' },
        { value: 'sp_check_in', label: 'Senior privileges check in' },
        { value: 'sp_check_out', label: 'Senior privileges check out' }
    ],
    radius: 12,
    size: "lg"
})

export default function ModeSelect({ onSelect }: { onSelect: (mode: ModeOption) => void }) {
    const [mode, setMode] = useState<ModeOption>('free_period');
    return (
        <Stack px={rem(20)} gap={0} style={{ justifyContent: "center", minHeight: "100vh" }}>
            <Text style={{
                fontSize: 24,
                fontWeight: 'bold',
                color: '#111827', // Dark text for high contrast
                textAlign: "center",
                margin: 0
            }}>
                What are you signing in for?
            </Text>
            <Text style={{
                fontSize: 14,
                color: '#4b5563', // A softer, medium gray
                textAlign: 'center',
                marginTop: 0
            }}>
                (Free period or senior privileges)
            </Text>
            <ModeSelectComponent
                value={mode}
                onChange={(val) => {
                    if (!val) return;
                    setMode(val as ModeOption);
                }}
            />
            <Button mt={rem(10)} radius={12} onClick={() => onSelect(mode)}>Submit</Button>
        </Stack>
    )
}
