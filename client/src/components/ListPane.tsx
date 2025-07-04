import { Button } from "./ui/button";

type ListPaneProps<T> = {
  items: T[];
  listItems: () => void;
  clearItems: () => void;
  setSelectedItem: (item: T) => void;
  renderItem: (item: T) => React.ReactNode;
  title: string;
  buttonText: string;
  isButtonDisabled?: boolean;
  showButtons?: boolean;
  compact?: boolean;
};

const ListPane = <T extends object>({
  items,
  listItems,
  clearItems,
  setSelectedItem,
  renderItem,
  title,
  buttonText,
  isButtonDisabled,
  showButtons = true,
  compact = false,
}: ListPaneProps<T>) => (
  <div className="bg-card rounded-lg shadow">
    <div className="p-4 border-b border-gray-200 dark:border-gray-800">
      <h3 className="font-semibold dark:text-white">{title}</h3>
    </div>
    <div className="p-4">
      {showButtons && (
        <>
          <Button
            variant="outline"
            className="w-full mb-4"
            onClick={listItems}
            disabled={isButtonDisabled}
          >
            {buttonText}
          </Button>
          <Button
            variant="outline"
            className="w-full mb-4"
            onClick={clearItems}
            disabled={items.length === 0}
          >
            Clear
          </Button>
        </>
      )}
      <div className={`${compact ? 'space-y-1' : 'space-y-2'} overflow-y-auto max-h-96`}>
        {items.map((item, index) => (
          <div
            key={index}
            className={`flex items-center ${compact ? 'p-1' : 'p-2'} rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer`}
            onClick={() => setSelectedItem(item)}
          >
            {renderItem(item)}
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default ListPane;
