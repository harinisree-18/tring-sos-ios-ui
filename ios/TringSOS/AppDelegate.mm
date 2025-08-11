#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <AVFoundation/AVFoundation.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"TringSOS";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  // Configure audio session for emergency sounds
  NSError *audioSessionError = nil;
  AVAudioSession *audioSession = [AVAudioSession sharedInstance];
  
  // Set audio session category to allow playback even when device is in silent mode
  if ([audioSession setCategory:AVAudioSessionCategoryPlayback
                         error:&audioSessionError]) {
    NSLog(@"Audio session category set to Playback");
  } else {
    NSLog(@"Failed to set audio session category: %@", audioSessionError.localizedDescription);
  }
  
  // Activate the audio session
  if ([audioSession setActive:YES error:&audioSessionError]) {
    NSLog(@"Audio session activated successfully");
  } else {
    NSLog(@"Failed to activate audio session: %@", audioSessionError.localizedDescription);
  }

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self getBundleURL];
}

- (NSURL *)getBundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

- (void)applicationWillResignActive:(UIApplication *)application
{
  // Handle audio session interruption
  NSError *audioSessionError = nil;
  AVAudioSession *audioSession = [AVAudioSession sharedInstance];
  
  if ([audioSession setActive:NO error:&audioSessionError]) {
    NSLog(@"Audio session deactivated on app resign");
  } else {
    NSLog(@"Failed to deactivate audio session: %@", audioSessionError.localizedDescription);
  }
}

- (void)applicationDidBecomeActive:(UIApplication *)application
{
  // Reactivate audio session
  NSError *audioSessionError = nil;
  AVAudioSession *audioSession = [AVAudioSession sharedInstance];
  
  if ([audioSession setActive:YES error:&audioSessionError]) {
    NSLog(@"Audio session reactivated on app become active");
  } else {
    NSLog(@"Failed to reactivate audio session: %@", audioSessionError.localizedDescription);
  }
}

@end
