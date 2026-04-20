import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useEvaluationDate } from '@spirit/prayer-feature';

import { getAllJournalEntries } from '../services/journalDb';
import { onSynced } from '../services/journalSync';
import {
  buildYearlyRhythmModel,
  type YearlyRhythmModel,
} from '../services/rhythmMetrics';
import RhythmCardContent from './RhythmCardContent';

type Props = {
  style?: StyleProp<ViewStyle>;
};

const RhythmCard: React.FC<Props> = ({ style }) => {
  const evaluationDate = useEvaluationDate();
  const [model, setModel] = React.useState<YearlyRhythmModel>(() =>
    buildYearlyRhythmModel([], evaluationDate)
  );

  const refresh = React.useCallback(
    async (shouldUpdate: () => boolean = () => true) => {
      try {
        const entries = await getAllJournalEntries();
        if (shouldUpdate()) {
          setModel(buildYearlyRhythmModel(entries, evaluationDate));
        }
      } catch {
        if (shouldUpdate()) {
          setModel(buildYearlyRhythmModel([], evaluationDate));
        }
      }
    },
    [evaluationDate]
  );

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      void refresh(() => active);

      return () => {
        active = false;
      };
    }, [refresh])
  );

  React.useEffect(() => {
    let active = true;
    void refresh(() => active);

    return () => {
      active = false;
    };
  }, [refresh]);

  React.useEffect(() => {
    const unsubscribe = onSynced.subscribe(() => {
      void refresh();
    });

    return () => {
      unsubscribe();
    };
  }, [refresh]);

  return <RhythmCardContent model={model} style={style} />;
};

export default RhythmCard;
