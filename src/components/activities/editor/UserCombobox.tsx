import * as React from "react";
import type { UUID } from "@/types";
import type { MemberOption } from "@/lib/groups/useGroupMembersForPicker";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserComboboxProps {
  members: MemberOption[];
  value: UUID | null;
  onChange: (userId: UUID) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function UserCombobox({
  members,
  value,
  onChange,
  disabled = false,
  placeholder = "Wybierz użytkownika...",
}: UserComboboxProps): JSX.Element {
  const [open, setOpen] = React.useState(false);

  const selectedMember = members.find((m) => m.userId === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between"
        >
          {selectedMember ? selectedMember.email : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Szukaj użytkownika..." />
          <CommandList>
            <CommandEmpty>Nie znaleziono użytkownika.</CommandEmpty>
            <CommandGroup>
              {members.map((member) => (
                <CommandItem
                  key={member.userId}
                  value={member.email}
                  onSelect={() => {
                    onChange(member.userId);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === member.userId ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col">
                    <span>{member.email}</span>
                    <span className="text-xs text-muted-foreground">{member.role}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
