import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { useEvaluationDate } from '@spirit/prayer-feature';

import { getAllJournalEntries } from '../services/journalDb.web';
import { onSynced } from '../services/journalSync.web';
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

  const refresh = React.useCallback(async () => {
    try {
      const entries = await getAllJournalEntries();
      setModel(buildYearlyRhythmModel(entries, evaluationDate));
    } catch {
      setModel(buildYearlyRhythmModel([], evaluationDate));
    }
  }, [evaluationDate]);

  React.useEffect(() => {
    void refresh();
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
