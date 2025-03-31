import { StyleSheet, ImageBackground, View, Dimensions, Image } from 'react-native';

export default function Background({ children }: { children: React.ReactNode }) {
  return (
    <ImageBackground
      source={require('../assets/images/meditation-background.png')}
      style={styles.background}
      resizeMode="cover"> 
      <View style={styles.overlay}>
        {children}
      </View>
    </ImageBackground>
  );
}

const { width, height } = Dimensions.get('window');
const imageAspectRatio = 1024 / 1536; // Original aspect ratio of your image

const styles = StyleSheet.create({
  background: {
    width: width,
    height: height,
    alignItems: 'center', // Center horizontally
    justifyContent: 'center', // Center vertically
    backgroundColor: 'black', // This fills any empty space when using 'contain'
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
});
