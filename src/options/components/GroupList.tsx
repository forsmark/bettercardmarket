import { useId } from "react";
import {
  EXPANSION_GROUPS,
  type ExpansionGroup,
  type ExpansionGroupMember,
} from "../../shared/expansion-groups";

type GroupListProps = {
  excluded: readonly string[];
  includedMembers: readonly string[];
  onExcludedChange: (excluded: string[]) => void;
  onIncludedMembersChange: (included: string[]) => void;
};

const toggle = (list: readonly string[], id: string, on: boolean) =>
  on ? [...list, id] : list.filter((item) => item !== id);

/** Buttons that allow single members of a group while the group is on. */
const MemberList = ({
  members,
  groupOn,
  included,
  onToggle,
}: {
  members: readonly ExpansionGroupMember[];
  groupOn: boolean;
  included: readonly string[];
  onToggle: (id: string, allowed: boolean) => void;
}) => {
  const hintId = useId();
  return (
    <div className="members">
      <p id={hintId} className="members__hint">
        {groupOn
          ? "Click a franchise to allow it. Allowed franchises keep the other rules."
          : "Turn on the group to skip these franchises."}
      </p>
      <ul className="members__list" aria-describedby={hintId}>
        {members.map((member) => {
          const allowed = !groupOn || included.includes(member.id);
          return (
            <li key={member.id}>
              <button
                type="button"
                className="member"
                aria-pressed={included.includes(member.id)}
                data-allowed={allowed}
                disabled={!groupOn}
                title={`Matches names that contain: ${member.patterns.join(", ")}`}
                onClick={() =>
                  onToggle(member.id, !included.includes(member.id))
                }
              >
                <span className="member__pip" aria-hidden="true" />
                {member.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const GroupRow = ({
  group,
  checked,
  includedMembers,
  onToggle,
  onToggleMember,
}: {
  group: ExpansionGroup;
  checked: boolean;
  includedMembers: readonly string[];
  onToggle: (checked: boolean) => void;
  onToggleMember: (id: string, allowed: boolean) => void;
}) => {
  const id = useId();
  return (
    <li className="group" data-excluded={checked}>
      <input
        id={id}
        type="checkbox"
        role="switch"
        className="switch"
        checked={checked}
        aria-describedby={`${id}-description`}
        onChange={(event) => onToggle(event.target.checked)}
      />
      <div className="group__text">
        <label htmlFor={id} className="group__label">
          {group.label}
        </label>
        <p id={`${id}-description`} className="group__description">
          {group.description}
        </p>
        <p className="group__patterns">
          <span className="visually-hidden">Matches names that contain: </span>
          {group.patterns.map((pattern) => (
            <code key={pattern}>{pattern}</code>
          ))}
        </p>
        {group.members && (
          <MemberList
            members={group.members}
            groupOn={checked}
            included={includedMembers}
            onToggle={onToggleMember}
          />
        )}
      </div>
    </li>
  );
};

/** Switches for the predefined expansion groups. On means "skip". */
export const GroupList = ({
  excluded,
  includedMembers,
  onExcludedChange,
  onIncludedMembersChange,
}: GroupListProps) => (
  <ul className="groups">
    {EXPANSION_GROUPS.map((group) => (
      <GroupRow
        key={group.id}
        group={group}
        checked={excluded.includes(group.id)}
        includedMembers={includedMembers}
        onToggle={(checked) =>
          onExcludedChange(toggle(excluded, group.id, checked))
        }
        onToggleMember={(memberId, allowed) =>
          onIncludedMembersChange(toggle(includedMembers, memberId, allowed))
        }
      />
    ))}
  </ul>
);
