'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { useConfirm } from '@/shared/ui/notifications';
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
} from '@/features/catalog/superadmin.actions';
import { TabDataTableLayout, type ColumnDef } from '@/shared/ui/TabDataTableLayout';

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  createdAt: Date;
}

interface CategoriesTabProps {
  categories: Category[];
}

export default function CategoriesTab({ categories }: CategoriesTabProps) {
  const [isPending, startTransition] = useTransition();
  const { confirmAction } = useConfirm();

  // Category Form State
  const [categoryName, setCategoryName] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [categoryParentId, setCategoryParentId] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const triggerNotification = (success: boolean, text: string) => {
    if (success) toast.success(text);
    else toast.error(text);
  };

  const handleCategoryNameChange = (name: string) => {
    setCategoryName(name);
    setCategorySlug(
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
    );
  };

  const renderCategoryOptions = (includeAllOption = false) => {
    const mainCats = categories.filter((c) => !c.parentId);
    return (
      <>
        <option value={includeAllOption ? 'all' : ''}>
          {includeAllOption ? 'All Categories' : 'Uncategorized'}
        </option>
        {mainCats.map((main) => {
          const subs = categories.filter((c) => c.parentId === main.id);
          return (
            <optgroup key={main.id} label={main.name}>
              <option value={main.id}>{main.name} (All)</option>
              {subs.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </optgroup>
          );
        })}
      </>
    );
  };

  const openAddCategory = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategorySlug('');
    setCategoryParentId('');
    setIsCategoryModalOpen(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setCategorySlug(cat.slug);
    setCategoryParentId(cat.parentId || '');
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        if (editingCategory) {
          await updateCategoryAction(editingCategory.id, categoryName, categorySlug, categoryParentId || null);
          triggerNotification(true, 'Category updated successfully.');
        } else {
          await createCategoryAction(categoryName, categorySlug, categoryParentId || null);
          triggerNotification(true, 'Category created successfully.');
        }
        setIsCategoryModalOpen(false);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to save category.';
        triggerNotification(false, msg);
      }
    });
  };

  const handleDeleteCategory = async (catId: string) => {
    const confirmed = await confirmAction({
      title: 'Delete Category',
      message: 'Are you sure you want to delete this category? This operation will fail if products are linked.',
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;

    toast.promise(
      deleteCategoryAction(catId),
      {
        loading: 'Deleting category...',
        success: 'Category deleted successfully.',
        error: (err) => err instanceof Error ? err.message : 'Failed to delete category.'
      }
    );
  };

  const columns: ColumnDef<Category>[] = [
    {
      header: 'Category Name',
      cell: (cat) => (
        <div className="font-bold flex items-center gap-2 flex-wrap text-zinc-900 dark:text-zinc-100">
          <span>{cat.name}</span>
          {cat.parentId ? (
            <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 font-mono text-[9px] uppercase tracking-wider dark:bg-zinc-850 dark:text-zinc-400">
              Sub of {categories.find((c) => c.id === cat.parentId)?.name || '?'}
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 font-mono text-[9px] uppercase tracking-wider dark:bg-purple-950/20 dark:text-purple-400">
              Main
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Slug',
      cell: (cat) => <span className="font-mono text-zinc-500">{cat.slug}</span>,
    },
    {
      header: 'Created',
      cell: (cat) => <span className="text-zinc-500 font-mono">{new Date(cat.createdAt).toLocaleDateString()}</span>,
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (cat) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => openEditCategory(cat)}
            className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
          >
            Edit
          </button>
          <button
            onClick={() => handleDeleteCategory(cat.id)}
            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/20 dark:hover:bg-red-900/30 dark:text-red-400 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  const renderMobileCard = (cat: Category) => (
    <div className="bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 rounded-xl p-3.5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{cat.name}</span>
            {cat.parentId ? (
              <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 font-mono text-[9px] uppercase dark:bg-zinc-850 dark:text-zinc-400">
                Sub
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 font-mono text-[9px] uppercase dark:bg-purple-950/20 dark:text-purple-400">
                Main
              </span>
            )}
          </div>
          <p className="text-[10px] text-zinc-400 font-mono mt-0.5">/{cat.slug}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => openEditCategory(cat)}
            className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
          >
            Edit
          </button>
          <button
            onClick={() => handleDeleteCategory(cat.id)}
            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/20 dark:hover:bg-red-900/30 dark:text-red-400 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );

  const modals = isCategoryModalOpen && (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-40" onClick={() => setIsCategoryModalOpen(false)}>
      <div
        className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 w-full sm:max-w-md shadow-2xl safe-area-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
            {editingCategory ? 'Edit Category' : 'Create Category'}
          </h2>
          <button
            onClick={() => setIsCategoryModalOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-500 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSaveCategory} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Category Name</label>
            <input
              required
              type="text"
              maxLength={50}
              value={categoryName}
              onChange={(e) => handleCategoryNameChange(e.target.value)}
              className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              placeholder="e.g. Mechanical Keyboards"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">URL Slug</label>
            <input
              required
              type="text"
              maxLength={50}
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-mono text-zinc-500 bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />
            <p className="text-[10px] text-zinc-400">Must be unique and URL-friendly (e.g. mechanical-keyboards)</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Parent Category (Optional)</label>
            <select
              value={categoryParentId}
              onChange={(e) => setCategoryParentId(e.target.value)}
              className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/40 appearance-none"
            >
              {renderCategoryOptions()}
            </select>
            <p className="text-[10px] text-zinc-400">Used to build hierarchical catalog navigation (e.g. Electronics / Laptops)</p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl transition-all cursor-pointer shadow-md shadow-purple-900/20 active:scale-[0.98] disabled:opacity-50"
            >
              {isPending ? 'Saving...' : 'Save Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <TabDataTableLayout
      isPending={isPending}
      title="Category Directory"
      subtitle="Control categories available for listings"
      buttonText="Create Category"
      onAddClick={openAddCategory}
      data={categories}
      columns={columns}
      renderMobileCard={renderMobileCard}
      emptyStateMessage="No categories configured."
      modals={modals}
    />
  );
}
