// Import the disableModelTabDebugInProduction function
import { disableModelTabDebugInProduction } from './hooks/use-model-tab';

// Import the debug configuration functions
import { 
  configureModelTabDebugForDevelopment
} from './hooks/use-model-tab';

// Configure ModelTab debug based on environment
if (process.env.NODE_ENV === 'production') {
  // Disable debug in production
  disableModelTabDebugInProduction();
} else {
  // Configure debug for development
  configureModelTabDebugForDevelopment({
    enableLogging: true,
    enableRenderTracking: true,
    enableDebouncing: true,
    debounceTimeMs: 100 // Increase debounce time for development
  });
}

// ... rest of your app code ... 