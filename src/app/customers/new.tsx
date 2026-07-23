import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Input, Screen } from '@/components/kit';
import { Spacing } from '@/constants/theme';
import { ApiError, api } from '@/lib/api';
import type { Contact } from '@/lib/types';

export default function NewCustomerScreen() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = displayName.trim().length > 0 && phone.trim().length > 0;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const created = await api.post<Contact>('/contacts', {
        displayName: displayName.trim(),
        phone: phone.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
      });
      router.replace(`/customers/${created.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create the customer');
      setBusy(false);
    }
  };

  return (
    <Screen tabInset={false}>
      {/* The native stack header supplies "New customer" + back. */}
      <Card style={{ gap: Spacing.three }}>
        <Field label="Name">
          <Input
            placeholder="Jane Customer"
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
          />
        </Field>
        <Field label="Phone">
          <Input
            placeholder="0400 000 000"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </Field>
        <Field label="Email (optional)">
          <Input
            placeholder="jane@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </Field>
        {error ? (
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        ) : null}
      </Card>

      <Button label="Save customer" icon="checkmark" loading={busy} disabled={!canSave} onPress={save} />

      <ThemedText type="small" themeColor="muted" style={{ textAlign: 'center' }}>
        Name and phone are required.
      </ThemedText>
    </Screen>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: Spacing.one + 2 }}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      {children}
    </View>
  );
}
