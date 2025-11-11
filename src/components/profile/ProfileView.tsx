import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ProfileData {
  id: string;
  email?: string;
  full_name: string;
  display_name: string;
  created_at: string;
}

interface ProfileViewProps {
  userEmail?: string;
}

export default function ProfileView({ userEmail }: ProfileViewProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await fetch("/api/profile");
      if (response.ok) {
        const data = await response.json();
        setProfile(data.data);
        setFullName(data.data.full_name || "");
        setDisplayName(data.data.display_name || "");
      } else {
        toast.error("Nie udało się załadować profilu");
      }
    } catch {
      toast.error("Błąd połączenia");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error("Imię i nazwisko nie może być puste");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          display_name: displayName.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data.data);
        toast.success("Profil zaktualizowany pomyślnie");
      } else {
        const errorData = await response.json();
        toast.error(errorData.error?.message || "Nie udało się zaktualizować profilu");
      }
    } catch {
      toast.error("Błąd połączenia");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (profile) {
      setFullName(profile.full_name || "");
      setDisplayName(profile.display_name || "");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ładowanie profilu...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Błąd</CardTitle>
          <CardDescription>Nie można załadować danych profilu</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ustawienia profilu</CardTitle>
        <CardDescription>Zarządzaj swoimi danymi osobowymi</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={profile.email || userEmail || ""} disabled className="bg-muted" />
            <p className="text-sm text-muted-foreground">Twój adres email nie może być zmieniony</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Imię i nazwisko</Label>
            <Input
              id="full_name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jan Kowalski"
              maxLength={100}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="display_name">Nazwa wyświetlana</Label>
            <Input
              id="display_name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Jan K."
              maxLength={50}
            />
            <p className="text-sm text-muted-foreground">
              Opcjonalna nazwa, która będzie wyświetlana innym użytkownikom
            </p>
          </div>

          <div className="space-y-2">
            <Label>Data utworzenia konta</Label>
            <p className="text-sm text-muted-foreground">
              {new Date(profile.created_at).toLocaleDateString("pl-PL", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={handleReset} disabled={saving}>
            Resetuj
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Zapisywanie..." : "Zapisz zmiany"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
