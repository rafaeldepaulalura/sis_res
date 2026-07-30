import {
  ACTION_PERMISSIONS,
  PAGE_PERMISSIONS,
  PERMISSION_HINT,
  PERMISSION_LABEL,
  type Permission,
} from '../lib/permissions';

// Grade de checkboxes usada ao criar/editar um sub-usuário: o dono marca
// quais páginas e quais ações o funcionário pode usar.
export function PermissionPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (p: Permission) =>
    onChange(
      value.includes(p) ? value.filter((x) => x !== p) : [...value, p],
    );

  const Item = ({ p }: { p: Permission }) => (
    <label className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50">
      <input
        type="checkbox"
        checked={value.includes(p)}
        onChange={() => toggle(p)}
        className="mt-0.5"
      />
      <span className="text-sm text-gray-700">
        {PERMISSION_LABEL[p]}
        {PERMISSION_HINT[p] && (
          <span className="block text-xs text-amber-600">
            {PERMISSION_HINT[p]}
          </span>
        )}
      </span>
    </label>
  );

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Páginas que ele pode ver
          </span>
          <button
            type="button"
            onClick={() =>
              onChange(
                PAGE_PERMISSIONS.every((p) => value.includes(p))
                  ? value.filter(
                      (p) => !PAGE_PERMISSIONS.includes(p as never),
                    )
                  : [
                      ...new Set([
                        ...value,
                        ...(PAGE_PERMISSIONS as readonly string[]),
                      ]),
                    ],
              )
            }
            className="text-xs text-primary hover:underline"
          >
            marcar/desmarcar todas
          </button>
        </div>
        <div className="grid gap-0.5 sm:grid-cols-2">
          {PAGE_PERMISSIONS.map((p) => (
            <Item key={p} p={p} />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
          Ações que ele pode executar
        </div>
        <div className="grid gap-0.5 sm:grid-cols-2">
          {ACTION_PERMISSIONS.map((p) => (
            <Item key={p} p={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
