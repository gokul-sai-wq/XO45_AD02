import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../theme';

export interface ReceiverNode {
  id: string;
  name: string;
  deviceType: 'phone' | 'tablet';
  range: string;
  snr: number;
  status: 'verified' | 'listening';
  latency: string;
}

interface ConfirmedReceiversListProps {
  nodes: ReceiverNode[];
  isAwaitingAcks?: boolean;
}

export const ConfirmedReceiversList: React.FC<ConfirmedReceiversListProps> = ({
  nodes,
  isAwaitingAcks = false,
}) => {
  const verifiedCount = nodes.filter((n) => n.status === 'verified').length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.pulseDot, isAwaitingAcks && styles.pulseDotActive]} />
          <Text style={styles.title}>CONFIRMED RECEIVERS ({verifiedCount}/{nodes.length})</Text>
        </View>
        <Text style={styles.protocolBadge}>Acoustic Slotted ACK</Text>
      </View>

      <View style={styles.list}>
        {nodes.map((node) => {
          const isVerified = node.status === 'verified';
          return (
            <View key={node.id} style={styles.nodeItem}>
              <View style={styles.nodeLeft}>
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons
                    name={node.deviceType === 'tablet' ? 'tablet' : 'cellphone'}
                    size={18}
                    color={isVerified ? Theme.colors.primary : Theme.colors.textDim}
                  />
                </View>
                <View>
                  <Text style={styles.nodeName}>{node.name}</Text>
                  <Text style={styles.nodeMeta}>
                    Range {node.range} • SNR +{node.snr} dB
                  </Text>
                </View>
              </View>

              <View style={styles.nodeRight}>
                {/* Signal strength bars */}
                <View style={styles.signalBars}>
                  <View style={[styles.sigBar, { height: 4, backgroundColor: Theme.colors.success }]} />
                  <View style={[styles.sigBar, { height: 7, backgroundColor: Theme.colors.success }]} />
                  <View style={[styles.sigBar, { height: 10, backgroundColor: Theme.colors.success }]} />
                  <View
                    style={[
                      styles.sigBar,
                      {
                        height: 13,
                        backgroundColor: node.snr > 20 ? Theme.colors.success : Theme.colors.borderLight,
                      },
                    ]}
                  />
                </View>

                <View
                  style={[
                    styles.statusTag,
                    isVerified ? styles.statusTagVerified : styles.statusTagListening,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusTagText,
                      isVerified ? styles.statusTagTextVerified : styles.statusTagTextListening,
                    ]}
                  >
                    {isVerified ? 'ACK CONFIRMED' : 'STANDBY'}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Theme.colors.bgCard,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.colors.success,
  },
  pulseDotActive: {
    backgroundColor: Theme.colors.primary,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
    letterSpacing: 0.5,
  },
  protocolBadge: {
    fontSize: 10,
    color: Theme.colors.textMuted,
    fontWeight: '500',
  },
  list: {
    gap: Theme.spacing.sm,
  },
  nodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.bgCardSubtle,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  nodeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: Theme.radius.sm,
    backgroundColor: Theme.colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  nodeName: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
  },
  nodeMeta: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  nodeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
  },
  signalBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 14,
  },
  sigBar: {
    width: 2.5,
    borderRadius: 1,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.radius.sm,
    borderWidth: 1,
  },
  statusTagVerified: {
    backgroundColor: Theme.colors.successMuted,
    borderColor: 'rgba(5, 150, 105, 0.25)',
  },
  statusTagListening: {
    backgroundColor: Theme.colors.bgCard,
    borderColor: Theme.colors.border,
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  statusTagTextVerified: {
    color: Theme.colors.successText,
  },
  statusTagTextListening: {
    color: Theme.colors.textDim,
  },
});
