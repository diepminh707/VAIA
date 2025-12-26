# Services

Thư mục này chứa tất cả logic business và API services, tách biệt khỏi UI components.

## Cấu trúc

```
src/services/
├── flowApi.ts          # Flow API service - xử lý gọi API
├── activityLogger.ts   # Activity logging service
├── index.ts           # Export tất cả services
└── README.md          # Documentation
```

## Flow API Service (`flowApi.ts`)

Service xử lý tất cả communication với Flow API thông qua Chrome extension messaging.

### Functions

#### `callFlowAPI(command: string, data?: any): Promise<any>`
Core function để gọi Flow API. Gửi message đến background worker và đợi response.

```typescript
import { callFlowAPI } from '@/services/flowApi';

const result = await callFlowAPI('testConnection');
```

#### `testConnection(): Promise<ConnectionStatus>`
Kiểm tra kết nối với Flow và lấy status hiện tại.

```typescript
import { testConnection } from '@/services/flowApi';

const status = await testConnection();
console.log(status.connected); // true/false
```

#### `generateImages(params: ImageGenerationParams): Promise<any>`
Tạo hình ảnh từ prompts.

```typescript
import { generateImages } from '@/services/flowApi';

const result = await generateImages({
  prompts: ['A sunset over mountains', 'A futuristic city'],
  aspectRatio: 'IMAGE_ASPECT_RATIO_SQUARE',
  referenceImageIds: [],
});

// result.media[].uri chứa URLs của images
```

#### `generateVideo(params: VideoGenerationParams): Promise<any>`
Tạo video từ prompt.

```typescript
import { generateVideo } from '@/services/flowApi';

const result = await generateVideo({
  type: 'text-to-video',
  prompt: 'A drone flying over a lake',
  model: 'VEO_3_1',
});
```

#### `uploadImage(params: ImageUploadParams): Promise<string>`
Upload hình ảnh và nhận media ID để sử dụng trong generation.

```typescript
import { uploadImage } from '@/services/flowApi';

const mediaId = await uploadImage({
  imageData: 'data:image/png;base64,...',
  mimeType: 'image/png',
  aspectRatio: 'IMAGE_ASPECT_RATIO_SQUARE',
});

// Sử dụng mediaId trong imageInputs
const result = await generateImages({
  prompts: ['A cat with this style'],
  aspectRatio: 'IMAGE_ASPECT_RATIO_SQUARE',
  referenceImageIds: [mediaId],
});
```

### Class: `FlowApiService`

Singleton service class với state management.

```typescript
import { flowApiService } from '@/services/flowApi';

// Check connection
const status = await flowApiService.checkConnection();

// Get cached status (không call API)
const cachedStatus = flowApiService.getConnectionStatus();

// Generate images
const images = await flowApiService.generateImages({
  prompts: ['...'],
  aspectRatio: '...',
});
```

## Activity Logger Service (`activityLogger.ts`)

Service quản lý activity logs với severity levels.

### Functions

#### `log(message: string, severity?: ActivitySeverity): void`
Log một activity mới.

```typescript
import { activityLogger } from '@/services/activityLogger';

activityLogger.log('Image generation started', 'info');
```

#### Helper methods:
- `success(message: string)` - Log success message
- `info(message: string)` - Log info message
- `warning(message: string)` - Log warning message
- `error(message: string)` - Log error message

```typescript
activityLogger.success('✅ Generated 2 images successfully');
activityLogger.error('❌ Connection failed');
```

#### `getActivities(): Activity[]`
Lấy tất cả activities.

```typescript
const activities = activityLogger.getActivities();
```

#### `clear(): void`
Xóa tất cả activities.

```typescript
activityLogger.clear();
```

#### `subscribe(listener: (activities: Activity[]) => void): () => void`
Subscribe để nhận updates khi activities thay đổi. Returns unsubscribe function.

```typescript
const unsubscribe = activityLogger.subscribe((activities) => {
  console.log('Activities updated:', activities);
});

// Later...
unsubscribe(); // Stop listening
```

## Usage trong Components

### Ví dụ: Sử dụng trong React component

```typescript
import { useState, useEffect } from 'react';
import { testConnection, generateImages, type ConnectionStatus } from '@/services/flowApi';
import { activityLogger, type Activity } from '@/services/activityLogger';

function MyComponent() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    // Check connection on mount
    testConnection()
      .then(setStatus)
      .catch(err => console.error(err));

    // Subscribe to activity updates
    const unsubscribe = activityLogger.subscribe(setActivities);
    return unsubscribe;
  }, []);

  const handleGenerate = async () => {
    try {
      activityLogger.info('Starting generation...');

      const result = await generateImages({
        prompts: ['...'],
        aspectRatio: '...',
      });

      activityLogger.success('Generation completed!');
    } catch (error) {
      activityLogger.error('Generation failed');
    }
  };

  return <div>...</div>;
}
```

## Best Practices

### 1. Tách biệt concerns
- ✅ UI components chỉ xử lý rendering và user interactions
- ✅ Services xử lý business logic và API calls
- ✅ Không gọi `chrome.runtime.sendMessage` trực tiếp trong components

### 2. Error handling
```typescript
try {
  const result = await generateImages({...});
  // Handle success
} catch (error) {
  // Handle error - service đã throw Error object
  const errorMsg = error instanceof Error ? error.message : String(error);
  console.error(errorMsg);
}
```

### 3. Type safety
Sử dụng TypeScript types được export từ services:

```typescript
import type {
  ConnectionStatus,
  ImageGenerationParams,
  VideoGenerationParams,
  Activity,
  ActivitySeverity
} from '@/services';
```

### 4. Singleton vs Functions
- **Singleton class** (`flowApiService`, `activityLogger`): Khi cần state management và caching
- **Pure functions** (`testConnection`, `generateImages`): Khi không cần state, chỉ call API

## Testing

Services có thể được test riêng biệt khỏi UI:

```typescript
import { generateImages } from '@/services/flowApi';

test('generateImages should return media URLs', async () => {
  const result = await generateImages({
    prompts: ['test'],
    aspectRatio: 'SQUARE',
  });

  expect(result.media).toBeDefined();
  expect(result.media.length).toBeGreaterThan(0);
});
```

## Future Improvements

- [ ] Add request caching/memoization
- [ ] Add retry logic for failed requests
- [ ] Add request cancellation support
- [ ] Add offline queue for requests
- [ ] Add comprehensive error types instead of generic Error
- [ ] Add request/response logging for debugging
- [ ] Add request timeout configuration
