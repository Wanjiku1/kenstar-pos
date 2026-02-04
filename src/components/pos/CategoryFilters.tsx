import { Button } from "@/components/ui/button";

interface CategoryFiltersProps {
  activeCategory: string;
  setCategory: (category: string) => void;
}

export function CategoryFilters({ activeCategory, setCategory }: CategoryFiltersProps) {
  const categories = [
    { id: 'all', label: 'All', icon: '✨' },
    { id: 'primary', label: 'Primary', icon: '🎒' },
    { id: 'highschool', label: 'High School', icon: '🎓' },
    { id: 'corporate', label: 'Corporate', icon: '💼' },
  ];

  return (
    <div className="flex gap-2 mb-2 overflow-x-auto pb-1 scrollbar-hide">
      {categories.map((cat) => (
        <Button 
          key={cat.id}
          variant={activeCategory === cat.id ? 'default' : 'outline'}
          onClick={() => setCategory(cat.id)}
          className={`rounded-full px-6 transition-all ${
            activeCategory === cat.id 
              ? 'bg-slate-800 text-white shadow-md' 
              : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
          }`}
        >
          <span className="mr-2">{cat.icon}</span> {cat.label}
        </Button>
      ))}
    </div>
  );
}